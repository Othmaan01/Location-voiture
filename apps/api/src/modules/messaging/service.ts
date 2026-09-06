import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Conversation, Message, StartConversationBody } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  bookings,
  conversations,
  messages,
  organizations,
  profiles,
  vehicles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { DomainError, forbidden, notFound } from "../../shared/errors.js";
import { PHOTOS_BUCKET, type StorageClient } from "../../shared/storage.js";
import type { NotificationsService } from "../notifications/service.js";
import { displayName } from "../reviews/service.js";

type ConversationRow = typeof conversations.$inferSelect;
type Side = "customer" | "organization";

/**
 * Messagerie (ADR-0012). Un fil general par client et par loueur, un fil par reservation.
 * Le cote "organisation" est partage par tous les membres ; le nom affiche au client est
 * celui du loueur, jamais celui d'un employe.
 */
export interface MessagingService {
  start(
    actor: Actor,
    input: StartConversationBody,
    requestId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }>;
  listMine(actor: Actor): Promise<Conversation[]>;
  listForOrganization(actor: Actor, organizationId: string): Promise<Conversation[]>;
  get(
    actor: Actor,
    conversationId: string,
    after?: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }>;
  send(actor: Actor, conversationId: string, body: string, requestId: string): Promise<Message>;
  markRead(actor: Actor, conversationId: string): Promise<void>;
  unread(actor: Actor): Promise<{ customer: number; organizations: Record<string, number> }>;
}

export function createMessagingService(
  db: Database,
  storage: StorageClient,
  notify: NotificationsService,
): MessagingService {
  function sideOf(actor: Actor, row: ConversationRow): Side | "staff" {
    if (actor.userId === row.customerId) return "customer";
    if (actor.memberships.has(row.organizationId)) return "organization";
    if (actor.platformRole) return "staff";
    throw notFound("Conversation");
  }

  async function loadVisible(actor: Actor, conversationId: string) {
    const [row] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!row) throw notFound("Conversation");
    const side = sideOf(actor, row);
    return { row, side };
  }

  async function hydrate(
    rows: ConversationRow[],
    viewerSide: Side | "staff",
  ): Promise<Conversation[]> {
    if (rows.length === 0) return [];
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const bookingIds = rows.map((r) => r.bookingId).filter((b): b is string => !!b);
    const vehicleIds = rows.map((r) => r.vehicleId).filter((v): v is string => !!v);
    const readColumn =
      viewerSide === "customer" ? conversations.customerReadAt : conversations.organizationReadAt;
    const otherType = viewerSide === "customer" ? "customer" : "organization_member";
    const [orgRows, customerRows, bookingRows, vehicleRows, unreadRows] = await Promise.all([
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          logoPath: organizations.logoPath,
        })
        .from(organizations)
        .where(inArray(organizations.id, orgIds)),
      db
        .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName })
        .from(profiles)
        .where(inArray(profiles.id, customerIds)),
      bookingIds.length > 0
        ? db
            .select({
              id: bookings.id,
              reference: bookings.reference,
              vehicleId: bookings.vehicleId,
            })
            .from(bookings)
            .where(inArray(bookings.id, bookingIds))
        : Promise.resolve([]),
      Promise.resolve([] as { id: string; brand: string; model: string }[]),
      db
        .select({ conversationId: messages.conversationId, n: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(
          and(
            inArray(
              messages.conversationId,
              rows.map((r) => r.id),
            ),
            sql`${messages.senderType} <> ${otherType}::public.actor_type`,
            sql`${messages.createdAt} > coalesce(${readColumn}, '-infinity'::timestamptz)`,
          ),
        )
        .groupBy(messages.conversationId),
    ]);
    const allVehicleIds = [...new Set([...vehicleIds, ...bookingRows.map((b) => b.vehicleId)])];
    const vehicleList =
      allVehicleIds.length > 0
        ? await db
            .select({ id: vehicles.id, brand: vehicles.brand, model: vehicles.model })
            .from(vehicles)
            .where(inArray(vehicles.id, allVehicleIds))
        : vehicleRows;
    const orgMap = new Map(orgRows.map((o) => [o.id, o]));
    const customerMap = new Map(customerRows.map((c) => [c.id, c]));
    const bookingMap = new Map(bookingRows.map((b) => [b.id, b]));
    const vehicleMap = new Map(vehicleList.map((v) => [v.id, `${v.brand} ${v.model}`]));
    const unreadMap = new Map(unreadRows.map((u) => [u.conversationId, u.n]));
    return rows.map((r) => {
      const o = orgMap.get(r.organizationId);
      const c = customerMap.get(r.customerId);
      const b = r.bookingId ? bookingMap.get(r.bookingId) : undefined;
      const vehicleId = r.vehicleId ?? b?.vehicleId ?? null;
      return {
        id: r.id,
        organizationId: r.organizationId,
        organizationName: o?.name ?? "",
        organizationLogoUrl: o?.logoPath ? storage.publicUrl(PHOTOS_BUCKET, o.logoPath) : null,
        customerId: r.customerId,
        customerName: displayName(c?.firstName ?? null, c?.lastName ?? null),
        bookingId: r.bookingId,
        bookingReference: b?.reference ?? null,
        vehicleLabel: vehicleId ? (vehicleMap.get(vehicleId) ?? null) : null,
        lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: r.lastMessagePreview,
        unreadCount: viewerSide === "staff" ? 0 : (unreadMap.get(r.id) ?? 0),
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async function messagesOf(
    row: ConversationRow,
    viewerSide: Side | "staff",
    after?: string,
  ): Promise<Message[]> {
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, row.organizationId))
      .limit(1);
    const [customer] = await db
      .select({ firstName: profiles.firstName, lastName: profiles.lastName })
      .from(profiles)
      .where(eq(profiles.id, row.customerId))
      .limit(1);
    const rows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, row.id),
          after ? gt(messages.createdAt, new Date(after)) : undefined,
        ),
      )
      .orderBy(asc(messages.createdAt))
      .limit(500);
    return rows.map((m) => {
      const senderSide: Side = m.senderType === "customer" ? "customer" : "organization";
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderSide,
        senderName:
          senderSide === "customer"
            ? displayName(customer?.firstName ?? null, customer?.lastName ?? null)
            : (org?.name ?? "Loueur"),
        mine: viewerSide === senderSide,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }

  async function append(
    row: ConversationRow,
    side: Side,
    actor: Actor,
    body: string,
    requestId: string,
  ) {
    const text = body.trim();
    const now = new Date();
    const inserted = await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(messages)
        .values({
          conversationId: row.id,
          senderId: actor.userId,
          senderType: side === "customer" ? "customer" : "organization_member",
          body: text,
          createdAt: now,
        })
        .returning();
      await tx
        .update(conversations)
        .set({
          lastMessageAt: now,
          lastMessagePreview: text.slice(0, 120),
          ...(side === "customer" ? { customerReadAt: now } : { organizationReadAt: now }),
        })
        .where(eq(conversations.id, row.id));
      await audit(tx, {
        actorId: actor.userId,
        actorType: side === "customer" ? "customer" : "organization_member",
        action: "message.send",
        subjectType: "conversation",
        subjectId: row.id,
        organizationId: row.organizationId,
        requestId,
      });
      return m!;
    });
    const preview = text.slice(0, 100);
    if (side === "customer") {
      void notify.notifyOrganization(row.organizationId, {
        kind: "message.new",
        title: "Nouveau message client",
        body: preview,
        data: { conversationId: row.id },
      });
    } else {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, row.organizationId))
        .limit(1);
      void notify.notifyUser(row.customerId, {
        kind: "message.new",
        title: org?.name ?? "Nouveau message",
        body: preview,
        data: { conversationId: row.id },
      });
    }
    return inserted;
  }

  return {
    /**
     * Ouverture d'un fil. Cote client : vers un loueur verifie, avec ou sans contexte.
     * Cote loueur : uniquement a partir d'une reservation (le loueur ne demarche jamais).
     */
    async start(actor, input, requestId) {
      assertCan(actor, "booking.create");
      const userId = actor.userId!;
      const isMember = actor.memberships.has(input.organizationId);
      const [org] = await db
        .select({ id: organizations.id, status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);
      if (!org || (!isMember && org.status !== "verified")) throw notFound("Loueur");
      if (isMember) {
        assertCan(actor, "booking.read_org", { organizationId: input.organizationId });
        if (!input.bookingId)
          throw new DomainError(
            "validation_failed",
            "Un loueur ecrit a un client a partir d'une reservation.",
            { field: "bookingId" },
          );
      }
      let bookingId: string | null = null;
      let vehicleId: string | null = input.vehicleId ?? null;
      let customerId = userId;
      if (input.bookingId) {
        const [b] = await db
          .select({
            id: bookings.id,
            customerId: bookings.customerId,
            organizationId: bookings.organizationId,
            vehicleId: bookings.vehicleId,
          })
          .from(bookings)
          .where(eq(bookings.id, input.bookingId))
          .limit(1);
        if (
          !b ||
          b.organizationId !== input.organizationId ||
          (!isMember && b.customerId !== userId)
        )
          throw notFound("Reservation");
        bookingId = b.id;
        vehicleId = b.vehicleId;
        customerId = b.customerId;
      }
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.organizationId, input.organizationId),
            eq(conversations.customerId, customerId),
            bookingId ? eq(conversations.bookingId, bookingId) : isNull(conversations.bookingId),
          ),
        )
        .limit(1);
      let row = existing[0];
      if (!row) {
        const [created] = await db
          .insert(conversations)
          .values({ organizationId: input.organizationId, customerId, bookingId, vehicleId })
          .returning();
        row = created!;
      } else if (vehicleId && !row.vehicleId) {
        await db.update(conversations).set({ vehicleId }).where(eq(conversations.id, row.id));
      }
      await append(row, isMember ? "organization" : "customer", actor, input.body, requestId);
      return this.get(actor, row.id);
    },

    async listMine(actor) {
      assertCan(actor, "booking.read_own");
      const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.customerId, actor.userId!))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(100);
      return hydrate(rows, "customer");
    },

    async listForOrganization(actor, organizationId) {
      assertCan(actor, "booking.read_org", { organizationId });
      const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.organizationId, organizationId))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(200);
      return hydrate(rows, "organization");
    },

    async get(actor, conversationId, after) {
      const { row, side } = await loadVisible(actor, conversationId);
      const [conversation] = await hydrate([row], side);
      return { conversation: conversation!, messages: await messagesOf(row, side, after) };
    },

    async send(actor, conversationId, body, requestId) {
      const { row, side } = await loadVisible(actor, conversationId);
      if (side === "staff") throw forbidden();
      if (side === "organization")
        assertCan(actor, "booking.read_org", { organizationId: row.organizationId });
      const m = await append(row, side, actor, body, requestId);
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, row.organizationId))
        .limit(1);
      const [customer] = await db
        .select({ firstName: profiles.firstName, lastName: profiles.lastName })
        .from(profiles)
        .where(eq(profiles.id, row.customerId))
        .limit(1);
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderSide: side,
        senderName:
          side === "customer"
            ? displayName(customer?.firstName ?? null, customer?.lastName ?? null)
            : (org?.name ?? "Loueur"),
        mine: true,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      };
    },

    async markRead(actor, conversationId) {
      const { row, side } = await loadVisible(actor, conversationId);
      if (side === "staff") return;
      await db
        .update(conversations)
        .set(
          side === "customer" ? { customerReadAt: new Date() } : { organizationReadAt: new Date() },
        )
        .where(eq(conversations.id, row.id));
    },

    async unread(actor) {
      if (!actor.userId) return { customer: 0, organizations: {} };
      const [mine] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(
          and(
            eq(conversations.customerId, actor.userId),
            sql`${messages.senderType} <> 'customer'::public.actor_type`,
            sql`${messages.createdAt} > coalesce(${conversations.customerReadAt}, '-infinity'::timestamptz)`,
          ),
        );
      const orgIds = [...actor.memberships.keys()];
      const orgRows =
        orgIds.length > 0
          ? await db
              .select({
                organizationId: conversations.organizationId,
                n: sql<number>`count(*)::int`,
              })
              .from(messages)
              .innerJoin(conversations, eq(conversations.id, messages.conversationId))
              .where(
                and(
                  inArray(conversations.organizationId, orgIds),
                  sql`${messages.senderType} = 'customer'::public.actor_type`,
                  sql`${messages.createdAt} > coalesce(${conversations.organizationReadAt}, '-infinity'::timestamptz)`,
                ),
              )
              .groupBy(conversations.organizationId)
          : [];
      return {
        customer: mine?.n ?? 0,
        organizations: Object.fromEntries(orgRows.map((r) => [r.organizationId, r.n])),
      };
    },
  };
}
