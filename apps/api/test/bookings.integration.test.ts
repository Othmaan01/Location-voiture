import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUser,
  createTestDatabase,
  createTestKeys,
  createTestServer,
  testDatabaseUrl,
} from "./helpers.js";

/** Flux de reservation : devis fige, demande idempotente, decision du loueur, transitions, concurrence. */
describe.skipIf(!testDatabaseUrl)("reservations", () => {
  let database: ReturnType<typeof createTestDatabase>;
  let app: Awaited<ReturnType<typeof createTestServer>>;
  let keys: Awaited<ReturnType<typeof createTestKeys>>;
  let owner: string;
  let customer: string;
  let other: string;
  let ownerToken: string;
  let customerToken: string;
  let otherToken: string;
  let admin: string;
  let adminToken: string;
  let orgId: string;
  let agencyId: string;
  let vehicleId: string;
  const stamp = Date.now();
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const inDays = (d: number, hour = 9) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(hour, 0, 0, 0);
    return x.toISOString();
  };

  beforeAll(async () => {
    database = createTestDatabase();
    keys = await createTestKeys();
    app = await createTestServer(database.db, keys.verifyToken);
    owner = await createAuthUser(database.sql, `owner-bk-${stamp}@test.local`);
    customer = await createAuthUser(database.sql, `customer-bk-${stamp}@test.local`);
    other = await createAuthUser(database.sql, `other-bk-${stamp}@test.local`);
    admin = await createAuthUser(database.sql, `admin-bk-${stamp}@test.local`);
    await database.sql`insert into public.platform_roles (user_id, role) values (${admin}, 'admin')`;
    adminToken = await keys.sign(admin, { aal: "aal2" });
    ownerToken = await keys.sign(owner);
    customerToken = await keys.sign(customer);
    otherToken = await keys.sign(other);
    const sql = database.sql;
    const [org] = await sql<
      { id: string }[]
    >`insert into public.organizations (name, slug, plan_code, status) values ('Loueur Resa', ${"loueur-resa-" + stamp}, 'free', 'verified') returning id`;
    orgId = org!.id;
    await sql`insert into public.organization_members (organization_id, user_id, role) values (${orgId}, ${owner}, 'owner')`;
    const [agency] = await sql<
      { id: string }[]
    >`insert into public.agencies (organization_id, name, slug, address_line, postal_code, city_name, latitude, longitude, phone, status) values (${orgId}, 'Agence', ${"agence-resa-" + stamp}, '1 rue', '69001', 'Lyon', 45.76, 4.83, '+33 4 00 00 00 00', 'published') returning id`;
    agencyId = agency!.id;
    const [vehicle] = await sql<
      { id: string }[]
    >`insert into public.vehicles (organization_id, agency_id, brand, model, category, transmission, fuel, status) values (${orgId}, ${agencyId}, 'Peugeot', '208', 'citadine', 'manuelle', 'essence', 'published') returning id`;
    vehicleId = vehicle!.id;
    await sql`insert into public.rate_plans (vehicle_id, organization_id, daily_cents, deposit_cents) values (${vehicleId}, ${orgId}, 5000, 80000)`;
    await sql`update public.profiles set phone = '+33600000000' where id = ${customer}`;
  });

  afterAll(async () => {
    await app.close();
    await database.sql`delete from public.bookings where organization_id = ${orgId}`;
    await database.sql`delete from public.quotes where organization_id = ${orgId}`;
    await database.sql`delete from public.organizations where id = ${orgId}`;
    await database.sql`delete from auth.users where id in (${owner}, ${customer}, ${other}, ${admin})`;
    await database.close();
  });

  const makeQuote = async (token: string | null, from: string, to: string) =>
    app.inject({
      method: "POST",
      url: "/v1/quotes",
      ...(token ? { headers: auth(token) } : {}),
      payload: { vehicleId, from, to },
    });

  it("un devis est calcule par le serveur, sans compte, et refuse un retrait trop proche", async () => {
    const res = await makeQuote(null, inDays(3), inDays(6));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      days: 3,
      total: { cents: 15000, currency: "EUR" },
      deposit: { cents: 80000 },
    });
    const soon = await makeQuote(null, new Date(Date.now() + 10 * 60_000).toISOString(), inDays(2));
    expect(soon.statusCode).toBe(422);
  });

  it("la demande exige un compte, une cle d'idempotence, un devis du demandeur, et ne prend aucun montant du client", async () => {
    const q = (await makeQuote(customerToken, inDays(3), inDays(6))).json<{ id: string }>();
    expect(
      (await app.inject({ method: "POST", url: "/v1/bookings", payload: { quoteId: q.id } }))
        .statusCode,
    ).toBe(401);
    const noKey = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: auth(customerToken),
      payload: { quoteId: q.id },
    });
    expect(noKey.statusCode).toBe(422);
    const tampered = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": `k-${stamp}-t` },
      payload: { quoteId: q.id, totalCents: 1 },
    });
    expect(tampered.statusCode).toBe(422);
    const stolen = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(otherToken), "idempotency-key": `k-${stamp}-s` },
      payload: { quoteId: q.id },
    });
    expect(stolen.statusCode).toBe(404);

    const key = `k-${stamp}-1`;
    const first = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": key },
      payload: { quoteId: q.id, message: "J'arrive vers 9h15" },
    });
    expect(first.statusCode).toBe(201);
    const booking = first.json<{
      id: string;
      status: string;
      contact: unknown;
      total: { cents: number };
      reference: string;
    }>();
    expect(booking).toMatchObject({ status: "requested", contact: null, total: { cents: 15000 } });
    expect(booking.reference).toMatch(/^LV-[A-Z0-9]{6}$/);

    // Retry reseau : meme cle -> meme reservation, pas de doublon.
    const replay = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": key },
      payload: { quoteId: q.id, message: "J'arrive vers 9h15" },
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json<{ id: string }>().id).toBe(booking.id);
    expect(replay.headers["idempotent-replayed"]).toBe("true");
    const reused = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": key },
      payload: { quoteId: q.id, message: "autre" },
    });
    expect(reused.statusCode).toBe(409);
    // Le meme devis ne peut pas produire une seconde demande.
    const twice = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": `k-${stamp}-2` },
      payload: { quoteId: q.id },
    });
    expect(twice.statusCode).toBe(409);
    const count = await database.sql<
      { n: number }[]
    >`select count(*)::int as n from public.bookings where quote_id = ${q.id}`;
    expect(count[0]?.n).toBe(1);
  });

  it("le loueur voit la demande (sans telephone client), la confirme ; le client voit alors le contact de l'agence", async () => {
    const inbox = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/bookings?scope=upcoming`,
      headers: auth(ownerToken),
    });
    expect(inbox.statusCode).toBe(200);
    const pending = inbox
      .json<{
        bookings: {
          id: string;
          status: string;
          customer: { phone: string | null; firstName: string | null } | null;
          customerMessage: string | null;
        }[];
      }>()
      .bookings.find((b) => b.status === "requested");
    expect(pending).toBeDefined();
    expect(pending?.customer?.phone).toBeNull();
    expect(pending?.customerMessage).toBe("J'arrive vers 9h15");
    // Un etranger : 404 ; le client ne peut pas confirmer lui-meme.
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/bookings/${pending!.id}`,
          headers: auth(otherToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${pending!.id}/confirm`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(403);
    const declineNoReason = await app.inject({
      method: "POST",
      url: `/v1/bookings/${pending!.id}/decline`,
      headers: auth(ownerToken),
      payload: {},
    });
    expect(declineNoReason.statusCode).toBe(422);

    const confirm = await app.inject({
      method: "POST",
      url: `/v1/bookings/${pending!.id}/confirm`,
      headers: auth(ownerToken),
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json()).toMatchObject({
      status: "confirmed",
      customer: { phone: "+33600000000" },
    });
    const mine = await app.inject({
      method: "GET",
      url: "/v1/me/bookings?scope=upcoming",
      headers: auth(customerToken),
    });
    const b = mine
      .json<{
        bookings: { id: string; contact: { phone: string | null } | null; events: unknown[] }[];
      }>()
      .bookings.find((x) => x.id === pending!.id);
    expect(b?.contact?.phone).toBe("+33 4 00 00 00 00");
    expect(b?.events).toHaveLength(2);
  });

  it("une seconde demande sur les memes dates est refusee a la confirmation, et un blocage chevauchant est refuse", async () => {
    const q2 = (await makeQuote(otherToken, inDays(3), inDays(5))).json<{
      id?: string;
      error?: unknown;
    }>();
    // Le devis est deja refuse : le vehicule est ferme sur ces dates.
    expect(q2.id).toBeUndefined();
    const block = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/blocks`,
      headers: auth(ownerToken),
      payload: { from: inDays(4), to: inDays(5), reason: "maintenance" },
    });
    expect(block.statusCode).toBe(409);
    const freeBlock = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/blocks`,
      headers: auth(ownerToken),
      payload: { from: inDays(10), to: inDays(12), reason: "maintenance", note: "Revision" },
    });
    expect(freeBlock.statusCode).toBe(201);
    const blockedQuote = await makeQuote(otherToken, inDays(10), inDays(11));
    expect(blockedQuote.statusCode).toBe(409);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/blocks/${freeBlock.json<{ id: string }>().id}`,
          headers: auth(otherToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/blocks/${freeBlock.json<{ id: string }>().id}`,
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(204);
  });

  it("deux confirmations concurrentes sur des demandes qui se chevauchent : une seule passe", async () => {
    const sql = database.sql;
    const from = inDays(20);
    const to = inDays(22);
    const [c2] = await sql<{ id: string }[]>`select id from auth.users where id = ${other}`;
    const makeRequest = async (userId: string) => {
      const [q] = await sql<
        { id: string }[]
      >`insert into public.quotes (user_id, vehicle_id, organization_id, rate_plan_id, pickup_agency_id, period, lines, subtotal_cents, total_cents, currency, expires_at)
        select ${userId}, ${vehicleId}, ${orgId}, rp.id, ${agencyId}, tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)'), '[]', 10000, 10000, 'EUR', now() + interval '1 hour' from public.rate_plans rp where rp.vehicle_id = ${vehicleId} and rp.is_active returning id`;
      const [b] = await sql<
        { id: string }[]
      >`insert into public.bookings (organization_id, agency_id, vehicle_id, customer_id, quote_id, period, status, total_cents, currency, price_snapshot) values (${orgId}, ${agencyId}, ${vehicleId}, ${userId}, ${q!.id}, tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)'), 'requested', 10000, 'EUR', '{}') returning id`;
      return b!.id;
    };
    const [b1, b2] = await Promise.all([makeRequest(customer), makeRequest(c2!.id)]);
    const results = await Promise.all(
      [b1, b2].map((id) =>
        app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/confirm`,
          headers: auth(ownerToken),
        }),
      ),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([200, 409]);
    const firm = await sql<
      { n: number }[]
    >`select count(*)::int as n from public.bookings where vehicle_id = ${vehicleId} and status = 'confirmed' and period && tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)')`;
    expect(firm[0]?.n).toBe(1);
  });

  it("cycle de vie : depart, retour ; annulation client ; expiration automatique des demandes", async () => {
    const confirmed = await database.sql<
      { id: string }[]
    >`select id from public.bookings where organization_id = ${orgId} and status = 'confirmed' order by created_at limit 1`;
    const id = confirmed[0]!.id;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/complete`,
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/start`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/start`,
          headers: auth(ownerToken),
        })
      ).json(),
    ).toMatchObject({ status: "active" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/cancel`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/complete`,
          headers: auth(ownerToken),
        })
      ).json(),
    ).toMatchObject({ status: "completed" });

    const q = (await makeQuote(customerToken, inDays(30), inDays(31))).json<{ id: string }>();
    const created = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": `k-${stamp}-3` },
      payload: { quoteId: q.id },
    });
    const bid = created.json<{ id: string }>().id;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${bid}/cancel`,
          headers: auth(customerToken),
          payload: { reason: "Changement de plan" },
        })
      ).json(),
    ).toMatchObject({ status: "cancelled", cancellationReason: "Changement de plan" });

    const q3 = (await makeQuote(customerToken, inDays(40), inDays(41))).json<{ id: string }>();
    const created3 = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": `k-${stamp}-4` },
      payload: { quoteId: q3.id },
    });
    const bid3 = created3.json<{ id: string }>().id;
    await database.sql`update public.bookings set expires_at = now() - interval '1 minute' where id = ${bid3}`;
    const { createBookingsService } = await import("../src/modules/bookings/service.js");
    const { fakeStorage } = await import("./helpers.js");
    const svc = createBookingsService(database.db, fakeStorage(), {
      notifyUser: async () => undefined,
      notifyOrganization: async () => undefined,
    });
    expect(await svc.expireOverdue()).toBeGreaterThanOrEqual(1);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/bookings/${bid3}`,
          headers: auth(customerToken),
        })
      ).json(),
    ).toMatchObject({ status: "expired" });
  });

  it("messagerie : le client ouvre un fil, le loueur repond, les non-lus se mettent a jour, un etranger ne voit rien", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/v1/conversations",
      headers: auth(customerToken),
      payload: {
        organizationId: orgId,
        vehicleId,
        body: "Bonjour, le vehicule est-il disponible ce week-end ?",
      },
    });
    expect(start.statusCode).toBe(201);
    const conversationId = start.json<{ conversation: { id: string } }>().conversation.id;
    expect(start.json()).toMatchObject({
      conversation: { organizationId: orgId, unreadCount: 0 },
      messages: [{ senderSide: "customer", mine: true }],
    });
    // Le meme client qui reecrit au meme loueur retombe sur le meme fil.
    const again = await app.inject({
      method: "POST",
      url: "/v1/conversations",
      headers: auth(customerToken),
      payload: { organizationId: orgId, body: "Et la semaine prochaine ?" },
    });
    expect(again.json<{ conversation: { id: string } }>().conversation.id).toBe(conversationId);

    const orgList = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/conversations`,
      headers: auth(ownerToken),
    });
    expect(orgList.statusCode).toBe(200);
    expect(orgList.json()).toMatchObject({
      conversations: [{ id: conversationId, unreadCount: 2 }],
    });
    const unreadOrg = await app.inject({
      method: "GET",
      url: "/v1/me/unread",
      headers: auth(ownerToken),
    });
    expect(unreadOrg.json<{ organizations: Record<string, number> }>().organizations[orgId]).toBe(
      2,
    );

    const replyMsg = await app.inject({
      method: "POST",
      url: `/v1/conversations/${conversationId}/messages`,
      headers: auth(ownerToken),
      payload: { body: "Oui, disponible. Passez a l'agence." },
    });
    expect(replyMsg.statusCode).toBe(201);
    expect(replyMsg.json()).toMatchObject({ senderSide: "organization", mine: true });

    const asCustomer = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}`,
      headers: auth(customerToken),
    });
    expect(asCustomer.json()).toMatchObject({ conversation: { unreadCount: 1 } });
    expect(
      asCustomer.json<{ messages: { mine: boolean }[] }>().messages.map((m) => m.mine),
    ).toEqual([true, true, false]);
    await app.inject({
      method: "POST",
      url: `/v1/conversations/${conversationId}/read`,
      headers: auth(customerToken),
    });
    const unreadCustomer = await app.inject({
      method: "GET",
      url: "/v1/me/unread",
      headers: auth(customerToken),
    });
    expect(unreadCustomer.json()).toMatchObject({ customer: 0 });

    // Etranger : 404, jamais 403.
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/conversations/${conversationId}`,
          headers: auth(otherToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/conversations/${conversationId}/messages`,
          headers: auth(otherToken),
          payload: { body: "intrus" },
        })
      ).statusCode,
    ).toBe(404);
    // Le loueur ecrit au client depuis une reservation (jamais sans contexte).
    const noContext = await app.inject({
      method: "POST",
      url: "/v1/conversations",
      headers: auth(ownerToken),
      payload: { organizationId: orgId, body: "Bonjour" },
    });
    expect(noContext.statusCode).toBe(422);
    const bookingRow = await database.sql<
      { id: string }[]
    >`select id from public.bookings where organization_id = ${orgId} and customer_id = ${customer} order by created_at limit 1`;
    const fromOrg = await app.inject({
      method: "POST",
      url: "/v1/conversations",
      headers: auth(ownerToken),
      payload: {
        organizationId: orgId,
        bookingId: bookingRow[0]!.id,
        body: "Pensez a votre permis.",
      },
    });
    expect(fromOrg.statusCode).toBe(201);
    expect(fromOrg.json()).toMatchObject({
      conversation: { bookingId: bookingRow[0]!.id, customerId: customer },
      messages: [{ senderSide: "organization", mine: true }],
    });
    // Message vide refuse.
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/conversations/${conversationId}/messages`,
          headers: auth(customerToken),
          payload: { body: "   " },
        })
      ).statusCode,
    ).toBe(422);
  });

  it("avis : seulement apres une location terminee, une fois, avec reponse du loueur et note publique", async () => {
    const completed = await database.sql<
      { id: string }[]
    >`select id from public.bookings where organization_id = ${orgId} and status = 'completed' order by created_at limit 1`;
    const requested = await database.sql<
      { id: string }[]
    >`select id from public.bookings where organization_id = ${orgId} and customer_id = ${customer} and status <> 'completed' order by created_at limit 1`;
    const completedId = completed[0]!.id;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${requested[0]!.id}/review`,
          headers: auth(customerToken),
          payload: { rating: 5 },
        })
      ).statusCode,
    ).toBe(409);
    const before = await app.inject({
      method: "GET",
      url: `/v1/bookings/${completedId}`,
      headers: auth(customerToken),
    });
    expect(before.json()).toMatchObject({ canReview: true, review: null });
    const created = await app.inject({
      method: "POST",
      url: `/v1/bookings/${completedId}/review`,
      headers: auth(customerToken),
      payload: { rating: 4, comment: "Vehicule propre, accueil rapide." },
    });
    expect(created.statusCode).toBe(201);
    const reviewId = created.json<{ id: string }>().id;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${completedId}/review`,
          headers: auth(customerToken),
          payload: { rating: 1 },
        })
      ).statusCode,
    ).toBe(409);
    const after = await app.inject({
      method: "GET",
      url: `/v1/bookings/${completedId}`,
      headers: auth(customerToken),
    });
    expect(after.json()).toMatchObject({ canReview: false, review: { rating: 4 } });

    const replied = await app.inject({
      method: "POST",
      url: `/v1/reviews/${reviewId}/reply`,
      headers: auth(ownerToken),
      payload: { reply: "Merci, a bientot !" },
    });
    expect(replied.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/reviews/${reviewId}/reply`,
          headers: auth(otherToken),
          payload: { reply: "intrus" },
        })
      ).statusCode,
    ).toBe(404);

    const publicList = await app.inject({ method: "GET", url: `/v1/loueurs/${orgId}/reviews` });
    expect(publicList.statusCode).toBe(200);
    expect(publicList.json()).toMatchObject({
      ratingAverage: 4,
      ratingCount: 1,
      reviews: [{ rating: 4, reply: "Merci, a bientot !" }],
    });
    const profile = await app.inject({ method: "GET", url: `/v1/loueurs/${orgId}` });
    expect(profile.json()).toMatchObject({ ratingAverage: 4, ratingCount: 1 });
  });

  it("litige : motif obligatoire, ouvert par le client sur une location en cours, resolu par l'administration seule", async () => {
    const q = (await makeQuote(customerToken, inDays(60), inDays(62))).json<{ id: string }>();
    const created = await app.inject({
      method: "POST",
      url: "/v1/bookings",
      headers: { ...auth(customerToken), "idempotency-key": `k-${stamp}-dispute` },
      payload: { quoteId: q.id },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: string }>().id;
    for (const step of ["confirm", "start"]) {
      expect(
        (
          await app.inject({
            method: "POST",
            url: `/v1/bookings/${id}/${step}`,
            headers: auth(ownerToken),
          })
        ).statusCode,
      ).toBe(200);
    }
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/dispute`,
          headers: auth(customerToken),
          payload: { reason: "" },
        })
      ).statusCode,
    ).toBe(422);
    const disputed = await app.inject({
      method: "POST",
      url: `/v1/bookings/${id}/dispute`,
      headers: auth(customerToken),
      payload: { reason: "Vehicule rendu avec une rayure qui etait deja la." },
    });
    expect(disputed.statusCode).toBe(200);
    expect(disputed.json()).toMatchObject({ status: "disputed" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/bookings/${id}/resolve`,
          headers: auth(ownerToken),
          payload: { reason: "On regle ca entre nous." },
        })
      ).statusCode,
    ).toBe(409);
    const list = await app.inject({
      method: "GET",
      url: "/v1/admin/disputes",
      headers: auth(adminToken),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json<{ bookings: { id: string }[] }>().bookings.map((b) => b.id)).toContain(id);
    const resolved = await app.inject({
      method: "POST",
      url: `/v1/bookings/${id}/resolve`,
      headers: auth(adminToken),
      payload: { reason: "Photos a l'appui : rayure anterieure, caution restituee." },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json()).toMatchObject({ status: "resolved" });
  });

  it("signalements : un client signale un loueur, pas sa propre organisation ; l'administration traite", async () => {
    const own = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: auth(ownerToken),
      payload: { targetType: "organization", targetId: orgId, reason: "spam" },
    });
    expect(own.statusCode).toBe(409);
    const created = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: auth(customerToken),
      payload: {
        targetType: "vehicle",
        targetId: vehicleId,
        reason: "fraud",
        details: "Annonce trompeuse.",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: orgId,
      status: "open",
      reason: "fraud",
    });
    const reportId = created.json<{ id: string }>().id;
    expect(
      (await app.inject({ method: "GET", url: "/v1/admin/reports", headers: auth(customerToken) }))
        .statusCode,
    ).toBe(403);
    const open = await app.inject({
      method: "GET",
      url: "/v1/admin/reports",
      headers: auth(adminToken),
    });
    expect(open.json<{ reports: { id: string }[] }>().reports.map((r) => r.id)).toContain(reportId);
    const done = await app.inject({
      method: "POST",
      url: `/v1/admin/reports/${reportId}/resolution`,
      headers: auth(adminToken),
      payload: { status: "dismissed", note: "Annonce conforme apres verification." },
    });
    expect(done.statusCode).toBe(200);
    expect(done.json()).toMatchObject({ status: "dismissed" });
  });
});
