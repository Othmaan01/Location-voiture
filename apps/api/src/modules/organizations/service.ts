import { and, eq, sql } from "drizzle-orm";
import type { CreateOrganizationBody, Organization } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { organizationMembers, organizations, plans } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { DomainError, notFound } from "../../shared/errors.js";

/** Cle de Luhn d'un SIRET (14 chiffres). */
export function isValidSiret(siret: string): boolean {
  if (!/^[0-9]{14}$/.test(siret)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    let digit = Number(siret[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function toDto(row: typeof organizations.$inferSelect): Organization {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    siret: row.siret,
    countryCode: row.countryCode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface OrganizationsService {
  create(actor: Actor, input: CreateOrganizationBody, requestId: string): Promise<Organization>;
  getById(actor: Actor, organizationId: string): Promise<Organization>;
  listMembers(
    actor: Actor,
    organizationId: string,
  ): Promise<{ userId: string; role: "owner" | "manager" | "agent"; joinedAt: string }[]>;
}

export function createOrganizationsService(db: Database): OrganizationsService {
  return {
    async create(actor, input, requestId) {
      assertCan(actor, "booking.create"); // tout utilisateur authentifie peut fonder une organisation
      const userId = actor.userId!;
      if (input.siret && !isValidSiret(input.siret)) {
        throw new DomainError("validation_failed", "SIRET invalide.", { field: "siret" });
      }
      const [defaultPlan] = await db
        .select({ code: plans.code })
        .from(plans)
        .where(sql`is_default`)
        .limit(1);
      if (!defaultPlan) throw new DomainError("internal", "Aucun plan par defaut configure.");

      return db.transaction(async (tx) => {
        const base = input.name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const slug = `${base || "organisation"}-${Math.random().toString(36).slice(2, 8)}`;
        let row: typeof organizations.$inferSelect | undefined;
        try {
          [row] = await tx
            .insert(organizations)
            .values({
              name: input.name,
              slug,
              legalName: input.legalName ?? null,
              siret: input.siret ?? null,
              countryCode: input.countryCode,
              planCode: defaultPlan.code,
            })
            .returning();
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new DomainError("conflict", "Une organisation avec ce SIRET existe deja.", {
              field: "siret",
            });
          }
          throw error;
        }
        if (!row) throw new DomainError("internal", "Creation impossible.");
        await tx
          .insert(organizationMembers)
          .values({ organizationId: row.id, userId, role: "owner" });
        await audit(tx, {
          actorId: userId,
          actorType: "organization_member",
          action: "organization.create",
          subjectType: "organization",
          subjectId: row.id,
          organizationId: row.id,
          requestId,
        });
        return toDto(row);
      });
    },

    async getById(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const [row] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!row) throw notFound("Organisation");
      return toDto(row);
    },

    async listMembers(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const rows = await db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, organizationId)));
      return rows.map((r) => ({
        userId: r.userId,
        role: r.role,
        joinedAt: r.joinedAt.toISOString(),
      }));
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
