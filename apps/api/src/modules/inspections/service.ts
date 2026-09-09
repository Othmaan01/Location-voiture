import { desc, eq } from "drizzle-orm";
import type { Inspection, InspectionInput } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  agencies,
  bookings,
  inspections,
  organizations,
  profiles,
  vehicles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import type { EmailGateway } from "../../shared/email.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { DOCUMENTS_BUCKET, type StorageClient } from "../../shared/storage.js";
import type { SupabaseAdmin } from "../../shared/supabase-admin.js";
import { parseRange } from "../availability/service.js";
import { renderInspectionPdf } from "./pdf.js";

const READ_URL_SECONDS = 3600;

export interface InspectionsService {
  create(
    actor: Actor,
    bookingId: string,
    input: InspectionInput,
    requestId: string,
  ): Promise<Inspection>;
  list(actor: Actor, bookingId: string): Promise<Inspection[]>;
}

/**
 * Etats des lieux (ADR-0018) : le loueur releve les dommages sur le croquis, le client signe
 * a l'ecran, le moteur produit le PDF, l'archive dans le bucket prive et l'envoie par e-mail
 * au client (adresse de son compte, jamais exposee au loueur) avec l'agence en copie.
 */
export function createInspectionsService(
  db: Database,
  storage: StorageClient,
  email: EmailGateway,
  admin: SupabaseAdmin,
): InspectionsService {
  async function loadBooking(actor: Actor, bookingId: string) {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!row) throw notFound("Reservation");
    const ok =
      actor.userId === row.customerId ||
      actor.memberships.has(row.organizationId) ||
      actor.platformRole !== null;
    if (!ok) throw notFound("Reservation");
    return row;
  }

  async function toDto(row: typeof inspections.$inferSelect): Promise<Inspection> {
    return {
      id: row.id,
      bookingId: row.bookingId,
      kind: row.kind,
      mileageKm: row.mileageKm,
      fuelEighths: row.fuelEighths,
      damages: row.damages.map((d) => ({
        x: d.x,
        y: d.y,
        type: d.type as Inspection["damages"][number]["type"],
        ...(d.note ? { note: d.note } : {}),
      })),
      comment: row.comment,
      staffName: row.staffName,
      pdfUrl: row.pdfPath
        ? await storage.createSignedReadUrl(DOCUMENTS_BUCKET, row.pdfPath, READ_URL_SECONDS)
        : null,
      sentTo: row.sentTo,
      sentAt: row.sentAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  return {
    async create(actor, bookingId, input, requestId) {
      const booking = await loadBooking(actor, bookingId);
      assertCan(actor, "vehicle.write", { organizationId: booking.organizationId });
      if (!["confirmed", "active", "completed"].includes(booking.status))
        throw new DomainError(
          "conflict",
          "Un etat des lieux se fait sur une reservation confirmee.",
        );
      if (input.kind === "departure" && booking.status === "completed")
        throw new DomainError(
          "conflict",
          "La location est terminee : etat des lieux de retour uniquement.",
        );

      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, booking.organizationId))
        .limit(1);
      const [agency] = await db
        .select({
          name: agencies.name,
          addressLine: agencies.addressLine,
          city: agencies.cityName,
          email: agencies.email,
        })
        .from(agencies)
        .where(eq(agencies.id, booking.agencyId))
        .limit(1);
      const [vehicle] = await db
        .select({
          brand: vehicles.brand,
          model: vehicles.model,
          licensePlate: vehicles.licensePlate,
        })
        .from(vehicles)
        .where(eq(vehicles.id, booking.vehicleId))
        .limit(1);
      const [customer] = await db
        .select({ firstName: profiles.firstName, lastName: profiles.lastName })
        .from(profiles)
        .where(eq(profiles.id, booking.customerId))
        .limit(1);
      const customerName =
        [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Client";
      const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehicule";
      const createdAt = new Date();
      const range = parseRange(booking.period);

      const pdf = await renderInspectionPdf({
        kind: input.kind,
        organizationName: org?.name ?? "Loueur",
        agencyLine: agency
          ? [agency.name, agency.addressLine, agency.city].filter(Boolean).join(", ")
          : null,
        vehicleLabel,
        licensePlate: vehicle?.licensePlate ?? null,
        customerName,
        period: { from: new Date(range.from), to: new Date(range.to) },
        mileageKm: input.mileageKm ?? null,
        fuelEighths: input.fuelEighths ?? null,
        damages: input.damages,
        comment: input.comment ?? null,
        staffName: input.staffName ?? null,
        customerSignature: input.customerSignature,
        createdAt,
      });
      const [row] = await db
        .insert(inspections)
        .values({
          bookingId,
          organizationId: booking.organizationId,
          vehicleId: booking.vehicleId,
          kind: input.kind,
          mileageKm: input.mileageKm ?? null,
          fuelEighths: input.fuelEighths ?? null,
          damages: input.damages,
          comment: input.comment ?? null,
          customerSignature: input.customerSignature,
          staffName: input.staffName ?? null,
          createdBy: actor.userId,
          createdAt,
        })
        .returning();
      const pdfPath = `inspections/${booking.organizationId}/${bookingId}/${row!.id}.pdf`;
      await storage.upload(DOCUMENTS_BUCKET, pdfPath, pdf, "application/pdf");

      // Destinataires : le client sur l'adresse de son compte, plus les adresses saisies ;
      // l'agence en copie et en adresse de reponse, pour que l'echange continue avec le loueur.
      const customerEmail = await admin.getUserEmail(booking.customerId);
      const recipients = [
        ...new Set([customerEmail, ...input.sendTo].filter((e): e is string => !!e)),
      ];
      let sentAt: Date | null = null;
      if (recipients.length > 0) {
        const label = input.kind === "departure" ? "de depart" : "de retour";
        const result = await email.send({
          to: recipients,
          ...(agency?.email ? { cc: [agency.email], replyTo: agency.email } : {}),
          subject: `Etat des lieux ${label} - ${vehicleLabel}`,
          text: [
            `Bonjour ${customerName},`,
            "",
            `Voici votre etat des lieux ${label}, signe sur ecran, en piece jointe.`,
            "",
            `${org?.name ?? "Votre loueur"}${agency?.email ? ` - ${agency.email}` : ""}`,
          ].join("\n"),
          attachments: [
            {
              filename: `etat-des-lieux-${input.kind === "departure" ? "depart" : "retour"}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
          ],
        });
        if (result.sent) sentAt = new Date();
      }
      const [updated] = await db
        .update(inspections)
        .set({ pdfPath, sentTo: sentAt ? recipients : [], sentAt })
        .where(eq(inspections.id, row!.id))
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: `inspection.${input.kind}`,
        subjectType: "booking",
        subjectId: bookingId,
        organizationId: booking.organizationId,
        metadata: { inspectionId: row!.id, damages: input.damages.length, sent: !!sentAt },
        requestId,
      });
      return toDto(updated!);
    },

    async list(actor, bookingId) {
      await loadBooking(actor, bookingId);
      const rows = await db
        .select()
        .from(inspections)
        .where(eq(inspections.bookingId, bookingId))
        .orderBy(desc(inspections.createdAt));
      return Promise.all(rows.map(toDto));
    },
  };
}
