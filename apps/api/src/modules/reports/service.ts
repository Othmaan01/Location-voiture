import { desc, eq, inArray } from "drizzle-orm";
import type { CreateReportBody, Report } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  conversations,
  organizations,
  profiles,
  reports,
  reviews,
  vehicles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { displayName } from "../reviews/service.js";

/** Signalements : la cible est rattachee a un loueur pour que l'admin agisse vite (suspension, masquage). */
export interface ReportsService {
  create(actor: Actor, input: CreateReportBody, requestId: string): Promise<Report>;
  list(actor: Actor, status: "open" | "resolved" | "dismissed"): Promise<Report[]>;
  resolve(
    actor: Actor,
    reportId: string,
    status: "resolved" | "dismissed",
    note: string | undefined,
    requestId: string,
  ): Promise<Report>;
}

export function createReportsService(db: Database): ReportsService {
  async function organizationOf(targetType: string, targetId: string): Promise<string | null> {
    if (targetType === "organization") {
      const [o] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, targetId))
        .limit(1);
      return o?.id ?? null;
    }
    if (targetType === "vehicle") {
      const [v] = await db
        .select({ organizationId: vehicles.organizationId })
        .from(vehicles)
        .where(eq(vehicles.id, targetId))
        .limit(1);
      return v?.organizationId ?? null;
    }
    if (targetType === "review") {
      const [r] = await db
        .select({ organizationId: reviews.organizationId })
        .from(reviews)
        .where(eq(reviews.id, targetId))
        .limit(1);
      return r?.organizationId ?? null;
    }
    const [c] = await db
      .select({ organizationId: conversations.organizationId })
      .from(conversations)
      .where(eq(conversations.id, targetId))
      .limit(1);
    return c?.organizationId ?? null;
  }

  async function hydrate(rows: (typeof reports.$inferSelect)[]): Promise<Report[]> {
    if (rows.length === 0) return [];
    const orgIds = [...new Set(rows.map((r) => r.organizationId).filter((x): x is string => !!x))];
    const reporterIds = [...new Set(rows.map((r) => r.reporterId).filter((x): x is string => !!x))];
    const [orgRows, reporterRows] = await Promise.all([
      orgIds.length > 0
        ? db
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(inArray(organizations.id, orgIds))
        : Promise.resolve([]),
      reporterIds.length > 0
        ? db
            .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName })
            .from(profiles)
            .where(inArray(profiles.id, reporterIds))
        : Promise.resolve([]),
    ]);
    const orgMap = new Map(orgRows.map((o) => [o.id, o.name]));
    const reporterMap = new Map(reporterRows.map((p) => [p.id, p]));
    return rows.map((r) => {
      const rep = r.reporterId ? reporterMap.get(r.reporterId) : undefined;
      return {
        id: r.id,
        targetType: r.targetType as Report["targetType"],
        targetId: r.targetId,
        organizationId: r.organizationId,
        organizationName: r.organizationId ? (orgMap.get(r.organizationId) ?? null) : null,
        reason: r.reason as Report["reason"],
        details: r.details,
        status: r.status as Report["status"],
        resolutionNote: r.resolutionNote,
        reporterName: displayName(rep?.firstName ?? null, rep?.lastName ?? null),
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      };
    });
  }

  return {
    async create(actor, input, requestId) {
      assertCan(actor, "booking.create");
      const organizationId = await organizationOf(input.targetType, input.targetId);
      if (!organizationId) throw notFound("Cible du signalement");
      if (actor.memberships.has(organizationId))
        throw new DomainError("conflict", "Vous ne pouvez pas signaler votre propre organisation.");
      const [row] = await db
        .insert(reports)
        .values({
          reporterId: actor.userId,
          targetType: input.targetType,
          targetId: input.targetId,
          organizationId,
          reason: input.reason,
          details: input.details?.trim() || null,
        })
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "customer",
        action: "report.create",
        subjectType: "report",
        subjectId: row!.id,
        organizationId,
        metadata: { targetType: input.targetType, reason: input.reason },
        requestId,
      });
      const [dto] = await hydrate([row!]);
      return dto!;
    },

    async list(actor, status) {
      assertCan(actor, "organization.suspend");
      const rows = await db
        .select()
        .from(reports)
        .where(eq(reports.status, status))
        .orderBy(desc(reports.createdAt))
        .limit(200);
      return hydrate(rows);
    },

    async resolve(actor, reportId, status, note, requestId) {
      assertCan(actor, "organization.suspend");
      const [row] = await db
        .update(reports)
        .set({
          status,
          resolutionNote: note ?? null,
          resolvedBy: actor.userId,
          resolvedAt: new Date(),
        })
        .where(eq(reports.id, reportId))
        .returning();
      if (!row) throw notFound("Signalement");
      await audit(db, {
        actorId: actor.userId,
        actorType: "platform",
        action: `report.${status}`,
        subjectType: "report",
        subjectId: reportId,
        organizationId: row.organizationId,
        metadata: note ? { note } : {},
        requestId,
      });
      const [dto] = await hydrate([row]);
      return dto!;
    },
  };
}
