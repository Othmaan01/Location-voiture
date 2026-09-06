import { and, eq, sql } from "drizzle-orm";
import type { AvailabilityBlockInputSchema } from "@lv/contracts";
import type { z } from "zod";

import type { Database } from "../../db/client.js";
import { availabilityBlocks, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";

export interface AvailabilityBlock {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  reason: "maintenance" | "external_rental" | "other";
  note: string | null;
}

/** "[2026-10-01 09:00:00+02,2026-10-04 09:00:00+02)" -> deux ISO. */
export function parseRange(range: string): { from: string; to: string } {
  const m = /^[[(]"?([^,"]+)"?,"?([^)\]"]+)"?[)\]]$/.exec(range);
  if (!m) throw new Error(`Periode illisible : ${range}`);
  return { from: new Date(m[1]!).toISOString(), to: new Date(m[2]!).toISOString() };
}

export const toRange = (from: string, to: string) =>
  sql`tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)')`;

export interface AvailabilityService {
  list(actor: Actor, vehicleId: string): Promise<AvailabilityBlock[]>;
  create(
    actor: Actor,
    vehicleId: string,
    input: z.infer<typeof AvailabilityBlockInputSchema>,
    requestId: string,
  ): Promise<AvailabilityBlock>;
  remove(actor: Actor, blockId: string, requestId: string): Promise<void>;
}

export function createAvailabilityService(db: Database): AvailabilityService {
  const dto = (row: typeof availabilityBlocks.$inferSelect): AvailabilityBlock => ({
    id: row.id,
    vehicleId: row.vehicleId,
    ...parseRange(row.period),
    reason: row.reason,
    note: row.note,
  });

  async function loadVehicle(actor: Actor, vehicleId: string) {
    const [v] = await db
      .select({ id: vehicles.id, organizationId: vehicles.organizationId })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    if (!v) throw notFound("Vehicule");
    assertCanOrHide(actor, "vehicle.read_org", { organizationId: v.organizationId }, "Vehicule");
    return v;
  }

  return {
    async list(actor, vehicleId) {
      await loadVehicle(actor, vehicleId);
      const rows = await db
        .select()
        .from(availabilityBlocks)
        .where(eq(availabilityBlocks.vehicleId, vehicleId))
        .orderBy(availabilityBlocks.period);
      return rows.map(dto);
    },

    async create(actor, vehicleId, input, requestId) {
      const v = await loadVehicle(actor, vehicleId);
      assertCan(actor, "availability.write", { organizationId: v.organizationId });
      if (new Date(input.to).getTime() <= new Date(input.from).getTime())
        throw new DomainError("validation_failed", "La fin doit etre apres le debut.", {
          field: "to",
        });
      // Un blocage ne peut pas chevaucher une reservation ferme : le pro doit d'abord la traiter.
      const [busy] = await db.execute<{ ok: boolean }>(
        sql`select public.vehicle_is_available(${vehicleId}::uuid, ${toRange(input.from, input.to)}) as ok`,
      );
      if (!busy?.ok)
        throw new DomainError(
          "conflict",
          "Une reservation confirmee ou un blocage existe deja sur cette periode.",
        );
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(availabilityBlocks)
            .values({
              vehicleId,
              organizationId: v.organizationId,
              period: toRange(input.from, input.to),
              reason: input.reason,
              note: input.note ?? null,
              createdBy: actor.userId,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "availability.block",
            subjectType: "vehicle",
            subjectId: vehicleId,
            organizationId: v.organizationId,
            metadata: { from: input.from, to: input.to, reason: input.reason },
            requestId,
          });
          return dto(row!);
        });
      } catch (error) {
        return translateDbError(error);
      }
    },

    async remove(actor, blockId, requestId) {
      const [row] = await db
        .select()
        .from(availabilityBlocks)
        .where(eq(availabilityBlocks.id, blockId))
        .limit(1);
      if (!row) throw notFound("Blocage");
      assertCanOrHide(actor, "vehicle.read_org", { organizationId: row.organizationId }, "Blocage");
      assertCan(actor, "availability.write", { organizationId: row.organizationId });
      await db.delete(availabilityBlocks).where(and(eq(availabilityBlocks.id, blockId)));
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "availability.unblock",
        subjectType: "vehicle",
        subjectId: row.vehicleId,
        organizationId: row.organizationId,
        requestId,
      });
    },
  };
}
