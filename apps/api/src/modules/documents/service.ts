import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Document, DocumentConfirmSchema } from "@lv/contracts";
import type { z } from "zod";

import type { Database } from "../../db/client.js";
import {
  agencies,
  documentAccessLog,
  documents,
  organizations,
  verificationRequests,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { DOCUMENTS_BUCKET, type StorageClient } from "../../shared/storage.js";
import { isAgencyComplete } from "../agencies/service.js";

export { DOCUMENTS_BUCKET };
const READ_TTL_SECONDS = 300;
const UPLOAD_TTL_SECONDS = 600;
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const REQUIRED_KINDS = ["kbis", "insurance"] as const;

export function documentDto(row: typeof documents.$inferSelect): Document {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    expiresAt: row.expiresAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export type Missing = "kbis" | "insurance" | "agency" | "siren";

export interface DocumentsService {
  list(actor: Actor, organizationId: string): Promise<Document[]>;
  createUpload(
    actor: Actor,
    organizationId: string,
    kind: string,
    mimeType: string,
  ): Promise<{ path: string; uploadUrl: string; token: string; expiresAt: string }>;
  confirm(
    actor: Actor,
    organizationId: string,
    input: z.infer<typeof DocumentConfirmSchema>,
    mimeType: string | null,
    requestId: string,
  ): Promise<Document>;
  readUrl(
    actor: Actor,
    documentId: string,
    requestId: string,
  ): Promise<{ url: string; expiresAt: string }>;
  remove(actor: Actor, documentId: string, requestId: string): Promise<void>;
  verificationStatus(
    actor: Actor,
    organizationId: string,
  ): Promise<{
    status: typeof organizations.$inferSelect.status;
    statusReason: string | null;
    missing: Missing[];
    submittedAt: string | null;
  }>;
  submitVerification(actor: Actor, organizationId: string, requestId: string): Promise<void>;
}

export function createDocumentsService(db: Database, storage: StorageClient): DocumentsService {
  async function missingFor(organizationId: string): Promise<Missing[]> {
    const missing: Missing[] = [];
    const [org] = await db
      .select({ siren: organizations.siren })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org?.siren) missing.push("siren");
    const docs = await db
      .select({ kind: documents.kind, status: documents.status })
      .from(documents)
      .where(eq(documents.organizationId, organizationId));
    for (const kind of REQUIRED_KINDS) {
      if (!docs.some((d) => d.kind === kind && d.status !== "rejected")) missing.push(kind);
    }
    const ags = await db.select().from(agencies).where(eq(agencies.organizationId, organizationId));
    if (!ags.some(isAgencyComplete)) missing.push("agency");
    return missing;
  }

  return {
    async list(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      // Les managers peuvent deposer ; la liste (metadonnees) leur est utile pour suivre l'etat.
      assertCan(actor, "organization.documents.write", { organizationId });
      const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.organizationId, organizationId))
        .orderBy(desc(documents.createdAt));
      return rows.map(documentDto);
    },

    async createUpload(actor, organizationId, kind, mimeType) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.documents.write", { organizationId });
      const path = `${organizationId}/${kind}/${randomUUID()}.${EXT[mimeType] ?? "bin"}`;
      const signed = await storage.createSignedUploadUrl(DOCUMENTS_BUCKET, path);
      return {
        path,
        uploadUrl: signed.uploadUrl,
        token: signed.token,
        expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
      };
    },

    async confirm(actor, organizationId, input, mimeType, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.documents.write", { organizationId });
      if (!input.path.startsWith(`${organizationId}/${input.kind}/`)) throw notFound("Fichier");
      if (!(await storage.exists(DOCUMENTS_BUCKET, input.path))) throw notFound("Fichier");
      const ext = input.path.split(".").pop() ?? "";
      const inferredMime =
        mimeType ??
        Object.entries(EXT).find(([, e]) => e === ext)?.[0] ??
        "application/octet-stream";
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(documents)
            .values({
              organizationId,
              uploadedBy: actor.userId,
              kind: input.kind,
              storagePath: input.path,
              mimeType: inferredMime,
              sizeBytes: 1,
              expiresAt: input.expiresAt ?? null,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "document.upload",
            subjectType: "document",
            subjectId: row!.id,
            organizationId,
            metadata: { kind: input.kind },
            requestId,
          });
          return documentDto(row!);
        });
      } catch (error) {
        return translateDbError(error);
      }
    },

    /** URL de lecture courte ; chaque emission est journalisee (qui, quoi, quand). */
    async readUrl(actor, documentId, requestId) {
      const [row] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      if (!row) throw notFound("Document");
      assertCanOrHide(
        actor,
        "organization.documents.read",
        { organizationId: row.organizationId },
        "Document",
      );
      const url = await storage.createSignedReadUrl(
        DOCUMENTS_BUCKET,
        row.storagePath,
        READ_TTL_SECONDS,
      );
      await db.insert(documentAccessLog).values({
        documentId,
        accessedBy: actor.userId,
        purpose: actor.platformRole ? "platform_review" : "owner_read",
        requestId,
      });
      return { url, expiresAt: new Date(Date.now() + READ_TTL_SECONDS * 1000).toISOString() };
    },

    async remove(actor, documentId, requestId) {
      const [row] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      if (!row) throw notFound("Document");
      assertCanOrHide(
        actor,
        "organization.read",
        { organizationId: row.organizationId },
        "Document",
      );
      assertCan(actor, "organization.documents.write", { organizationId: row.organizationId });
      if (row.status === "accepted")
        throw new DomainError("conflict", "Un document accepte ne peut pas etre supprime.");
      await db.transaction(async (tx) => {
        await tx.delete(documents).where(eq(documents.id, documentId));
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "document.delete",
          subjectType: "document",
          subjectId: documentId,
          organizationId: row.organizationId,
          requestId,
        });
      });
      await storage.remove(DOCUMENTS_BUCKET, [row.storagePath]);
    },

    async verificationStatus(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const [org] = await db
        .select({ status: organizations.status, statusReason: organizations.statusReason })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw notFound("Organisation");
      const [last] = await db
        .select({ submittedAt: verificationRequests.submittedAt })
        .from(verificationRequests)
        .where(eq(verificationRequests.organizationId, organizationId))
        .orderBy(desc(verificationRequests.submittedAt))
        .limit(1);
      return {
        status: org.status,
        statusReason: org.statusReason,
        missing: await missingFor(organizationId),
        submittedAt: last?.submittedAt.toISOString() ?? null,
      };
    },

    async submitVerification(actor, organizationId, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.documents.write", { organizationId });
      const [org] = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw notFound("Organisation");
      if (org.status === "verified")
        throw new DomainError("conflict", "Organisation deja verifiee.");
      if (org.status === "suspended") throw new DomainError("conflict", "Organisation suspendue.");
      if (org.status === "submitted" || org.status === "under_review")
        throw new DomainError("conflict", "Une demande de verification est deja en cours.");
      const missing = await missingFor(organizationId);
      if (missing.length > 0) throw new DomainError("conflict", "Dossier incomplet.", { missing });
      await db.transaction(async (tx) => {
        await tx
          .update(organizations)
          .set({ status: "submitted", statusReason: null })
          .where(and(eq(organizations.id, organizationId)));
        await tx.insert(verificationRequests).values({ organizationId, submittedBy: actor.userId });
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "organization.verification.submit",
          subjectType: "organization",
          subjectId: organizationId,
          organizationId,
          requestId,
        });
      });
    },
  };
}
