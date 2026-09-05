import type { Database, Transaction } from "../db/client.js";
import { auditLog } from "../db/schema.js";

export interface AuditEntry {
  actorId: string | null;
  actorType: "customer" | "organization_member" | "platform" | "system";
  action: string;
  subjectType: string;
  subjectId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
}

/** Ecrit une ligne d'audit, de preference dans la transaction de l'action auditee. */
export async function audit(db: Database | Transaction, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    actorType: entry.actorType,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId ?? null,
    organizationId: entry.organizationId ?? null,
    metadata: entry.metadata ?? {},
    requestId: entry.requestId ?? null,
  });
}
