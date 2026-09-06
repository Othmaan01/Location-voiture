import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Document } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  agencies,
  documents,
  organizations,
  vehicles,
  verificationRequests,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { documentDto } from "../documents/service.js";

export interface AdminService {
  verificationQueue(actor: Actor): Promise<
    {
      organizationId: string;
      organizationName: string;
      legalName: string | null;
      siren: string | null;
      status: "submitted" | "under_review";
      submittedAt: string;
      documents: Document[];
      agencies: { id: string; name: string; siret: string | null; cityName: string | null }[];
    }[]
  >;
  decideVerification(
    actor: Actor,
    organizationId: string,
    decision: "verified" | "rejected",
    reason: string | undefined,
    notes: string | undefined,
    requestId: string,
  ): Promise<void>;
  reviewDocument(
    actor: Actor,
    documentId: string,
    status: "accepted" | "rejected",
    rejectionReason: string | undefined,
    requestId: string,
  ): Promise<Document>;
  suspendOrganization(
    actor: Actor,
    organizationId: string,
    suspend: boolean,
    reason: string | undefined,
    requestId: string,
  ): Promise<void>;
  suspendVehicle(
    actor: Actor,
    vehicleId: string,
    suspend: boolean,
    reason: string | undefined,
    requestId: string,
  ): Promise<void>;
}

/**
 * Administration interne. Chaque action exige un role plateforme (matrice ADR-0007)
 * et produit une ligne d'audit ; les decisions de verification sont historisees.
 */
export function createAdminService(db: Database): AdminService {
  return {
    async verificationQueue(actor) {
      assertCan(actor, "organization.verify");
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          legalName: organizations.legalName,
          siren: organizations.siren,
          status: organizations.status,
        })
        .from(organizations)
        .where(inArray(organizations.status, ["submitted", "under_review"]));
      if (orgs.length === 0) return [];
      const ids = orgs.map((o) => o.id);
      const [reqs, docs, ags] = await Promise.all([
        db
          .select()
          .from(verificationRequests)
          .where(
            and(
              inArray(verificationRequests.organizationId, ids),
              isNull(verificationRequests.decidedAt),
            ),
          )
          .orderBy(asc(verificationRequests.submittedAt)),
        db
          .select()
          .from(documents)
          .where(inArray(documents.organizationId, ids))
          .orderBy(desc(documents.createdAt)),
        db
          .select({
            id: agencies.id,
            organizationId: agencies.organizationId,
            name: agencies.name,
            siret: agencies.siret,
            cityName: agencies.cityName,
          })
          .from(agencies)
          .where(inArray(agencies.organizationId, ids))
          .orderBy(asc(agencies.createdAt)),
      ]);
      return orgs
        .map((o) => ({
          organizationId: o.id,
          organizationName: o.name,
          legalName: o.legalName,
          siren: o.siren,
          status: o.status as "submitted" | "under_review",
          submittedAt: (
            reqs.find((r) => r.organizationId === o.id)?.submittedAt ?? new Date()
          ).toISOString(),
          documents: docs.filter((d) => d.organizationId === o.id).map(documentDto),
          agencies: ags
            .filter((a) => a.organizationId === o.id)
            .map(({ id, name, siret, cityName }) => ({ id, name, siret, cityName })),
        }))
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    },

    async decideVerification(actor, organizationId, decision, reason, notes, requestId) {
      assertCan(actor, "organization.verify");
      const [org] = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw notFound("Organisation");
      if (org.status !== "submitted" && org.status !== "under_review")
        throw new DomainError("conflict", "Aucune demande de verification en attente.");
      await db.transaction(async (tx) => {
        await tx
          .update(organizations)
          .set({
            status: decision,
            statusReason: decision === "rejected" ? (reason ?? null) : null,
          })
          .where(eq(organizations.id, organizationId));
        await tx
          .update(verificationRequests)
          .set({ decidedBy: actor.userId, decidedAt: new Date(), decision, notes: notes ?? null })
          .where(
            and(
              eq(verificationRequests.organizationId, organizationId),
              isNull(verificationRequests.decidedAt),
            ),
          );
        // Dossier valide : les documents encore en attente sont acceptes avec lui (un refus individuel reste possible avant).
        if (decision === "verified") {
          await tx
            .update(documents)
            .set({
              status: "accepted",
              reviewedBy: actor.userId,
              reviewedAt: new Date(),
              rejectionReason: null,
            })
            .where(
              and(eq(documents.organizationId, organizationId), eq(documents.status, "pending")),
            );
        }
        await audit(tx, {
          actorId: actor.userId,
          actorType: "platform",
          action: `organization.verification.${decision}`,
          subjectType: "organization",
          subjectId: organizationId,
          organizationId,
          metadata: { reason: reason ?? null },
          requestId,
        });
      });
    },

    async reviewDocument(actor, documentId, status, rejectionReason, requestId) {
      assertCan(actor, "organization.verify");
      const [row] = await db
        .update(documents)
        .set({
          status,
          rejectionReason: status === "rejected" ? (rejectionReason ?? null) : null,
          reviewedBy: actor.userId,
          reviewedAt: new Date(),
        })
        .where(eq(documents.id, documentId))
        .returning();
      if (!row) throw notFound("Document");
      await audit(db, {
        actorId: actor.userId,
        actorType: "platform",
        action: `document.${status}`,
        subjectType: "document",
        subjectId: documentId,
        organizationId: row.organizationId,
        requestId,
      });
      return documentDto(row);
    },

    async suspendOrganization(actor, organizationId, suspend, reason, requestId) {
      assertCan(actor, "organization.suspend", { organizationId });
      const [org] = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw notFound("Organisation");
      if (suspend && org.status === "suspended") return;
      if (!suspend && org.status !== "suspended") return;
      await db.transaction(async (tx) => {
        // Levee de suspension : retour en brouillon (une nouvelle verification est requise).
        await tx
          .update(organizations)
          .set({ status: suspend ? "suspended" : "draft", statusReason: reason ?? null })
          .where(eq(organizations.id, organizationId));
        if (suspend)
          await tx
            .update(vehicles)
            .set({ status: "draft" })
            .where(
              and(eq(vehicles.organizationId, organizationId), eq(vehicles.status, "published")),
            );
        await audit(tx, {
          actorId: actor.userId,
          actorType: "platform",
          action: suspend ? "organization.suspend" : "organization.unsuspend",
          subjectType: "organization",
          subjectId: organizationId,
          organizationId,
          metadata: { reason: reason ?? null },
          requestId,
        });
      });
    },

    async suspendVehicle(actor, vehicleId, suspend, reason, requestId) {
      assertCan(actor, "vehicle.suspend");
      const [row] = await db
        .update(vehicles)
        .set(
          suspend
            ? { suspendedAt: new Date(), suspendedReason: reason ?? null, status: "draft" }
            : { suspendedAt: null, suspendedReason: null },
        )
        .where(eq(vehicles.id, vehicleId))
        .returning({ organizationId: vehicles.organizationId });
      if (!row) throw notFound("Vehicule");
      await audit(db, {
        actorId: actor.userId,
        actorType: "platform",
        action: suspend ? "vehicle.suspend" : "vehicle.unsuspend",
        subjectType: "vehicle",
        subjectId: vehicleId,
        organizationId: row.organizationId,
        metadata: { reason: reason ?? null },
        requestId,
      });
    },
  };
}
