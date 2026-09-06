import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUser,
  createTestDatabase,
  createTestKeys,
  createTestServer,
  testDatabaseUrl,
} from "./helpers.js";

/**
 * Tests d'integration contre une vraie base Supabase locale (migrations appliquees).
 * Lances en CI ; en local, `supabase start` puis TEST_DATABASE_URL.
 */
describe.skipIf(!testDatabaseUrl)("organizations — API + authz + base", () => {
  let database: ReturnType<typeof createTestDatabase>;
  let app: Awaited<ReturnType<typeof createTestServer>>;
  let keys: Awaited<ReturnType<typeof createTestKeys>>;
  let alice: string;
  let bob: string;
  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    database = createTestDatabase();
    keys = await createTestKeys();
    app = await createTestServer(database.db, keys.verifyToken);
    const stamp = Date.now();
    alice = await createAuthUser(database.sql, `alice-${stamp}@test.local`);
    bob = await createAuthUser(database.sql, `bob-${stamp}@test.local`);
    aliceToken = await keys.sign(alice);
    bobToken = await keys.sign(bob);
  });

  afterAll(async () => {
    await app.close();
    const sql = database.sql;
    const orgs = await sql<
      { organization_id: string }[]
    >`select organization_id from public.organization_members where user_id in (${alice}, ${bob})`;
    const ids = orgs.map((o) => o.organization_id);
    if (ids.length > 0) {
      await sql`delete from public.bookings where organization_id in ${sql(ids)}`;
      await sql`delete from public.quotes where organization_id in ${sql(ids)}`;
      await sql`delete from public.organizations where id in ${sql(ids)}`;
    }
    await sql`delete from auth.users where id in (${alice}, ${bob})`;
    await database.close();
  });

  it("refuse les routes protegees sans token, et un token invalide n'est jamais silencieux", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/me" })).statusCode).toBe(401);
    const bad = await app.inject({
      method: "GET",
      url: "/health",
      headers: { authorization: "Bearer nope" },
    });
    expect(bad.statusCode).toBe(401);
  });

  it("GET /v1/me renvoie l'identite et aucune appartenance au depart", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ userId: alice, platformRole: null, memberships: [] });
  });

  it("cree une organisation : le createur devient owner, l'audit est ecrit, le plan par defaut est applique", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: "Auto Prestige Lyon", siren: "732829320" },
    });
    expect(res.statusCode).toBe(201);
    const org = res.json<{ id: string; status: string }>();
    expect(org.status).toBe("draft");

    const me = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(me.json()).toMatchObject({ memberships: [{ organizationId: org.id, role: "owner" }] });

    const audit = await database.sql<
      { action: string }[]
    >`select action from public.audit_log where subject_id = ${org.id}::uuid`;
    expect(audit.map((r) => r.action)).toContain("organization.create");

    const plan = await database.sql<
      { plan_code: string }[]
    >`select plan_code from public.organizations where id = ${org.id}::uuid`;
    expect(plan[0]?.plan_code).toBe("starter");

    // Abonnement : essai de 14 jours sur Starter, grille visible
    const overview = await app.inject({
      method: "GET",
      url: `/v1/organizations/${org.id}/subscription`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json()).toMatchObject({
      plan: { code: "starter", maxVehicles: 3, monthlyPriceCents: 2900 },
      status: "trialing",
      publishedCount: 0,
    });
    expect(overview.json<{ plans: { code: string }[] }>().plans.map((p) => p.code)).toEqual([
      "starter",
      "pro",
      "business",
      "fleet",
    ]);

    // Personnalisation : bio, site, accent ; accent hors liste refuse
    const branded = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${org.id}`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { bio: "Location premium a Lyon", website: "https://exemple.fr", accent: "gold" },
    });
    expect(branded.statusCode).toBe(200);
    expect(branded.json()).toMatchObject({ bio: "Location premium a Lyon", accent: "gold" });
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/v1/organizations/${org.id}`,
          headers: { authorization: `Bearer ${aliceToken}` },
          payload: { accent: "pink" },
        })
      ).statusCode,
    ).toBe(422);
  });

  it("mode prefere : client par defaut, modifiable, jamais un role", async () => {
    const before = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(before.json()).toMatchObject({ preferredMode: "client" });
    const updated = await app.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { preferredMode: "pro" },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ preferredMode: "pro", platformRole: null });
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: "/v1/me",
          headers: { authorization: `Bearer ${aliceToken}` },
          payload: { preferredMode: "admin" },
        })
      ).statusCode,
    ).toBe(422);
  });

  it("IDOR : un autre utilisateur obtient 404 (pas 403) sur l'organisation et ses membres", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: "Org privee" },
    });
    const orgId = created.json<{ id: string }>().id;

    const asOwner = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(asOwner.statusCode).toBe(200);

    const asStranger = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(asStranger.statusCode).toBe(404);
    const members = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(members.statusCode).toBe(404);
  });

  it("mass assignment : les champs inconnus sont rejetes (422), le SIREN invalide aussi", async () => {
    const extra = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { name: "Hack", status: "verified", planCode: "pro" },
    });
    expect(extra.statusCode).toBe(422);
    const badSiren = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { name: "Hack", siren: "732829321" },
    });
    expect(badSiren.statusCode).toBe(422);
    expect(badSiren.json()).toMatchObject({ error: { code: "validation_failed" } });
  });

  it("suppression d'une organisation : confirmation exigee, owner uniquement, cascade", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { name: "A supprimer", siren: "552032534" },
    });
    expect(created.statusCode).toBe(201);
    const orgId = created.json<{ id: string }>().id;
    const agency = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/agencies`,
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { name: "Siege", siret: "55203253400703" },
    });
    expect(agency.statusCode).toBe(201);

    const noConfirm = await app.inject({
      method: "DELETE",
      url: `/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { confirmation: "oui" },
    });
    expect(noConfirm.statusCode).toBe(422);
    const stranger = await app.inject({
      method: "DELETE",
      url: `/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { confirmation: "SUPPRIMER" },
    });
    expect(stranger.statusCode).toBe(404);
    const ok = await app.inject({
      method: "DELETE",
      url: `/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { confirmation: "SUPPRIMER" },
    });
    expect(ok.statusCode).toBe(204);
    const gone = await database.sql<
      { n: string }[]
    >`select count(*)::text as n from public.agencies where organization_id = ${orgId}::uuid`;
    expect(gone[0]?.n).toBe("0");
    const me = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(
      me
        .json<{ memberships: { organizationId: string }[] }>()
        .memberships.map((m) => m.organizationId),
    ).not.toContain(orgId);
  });

  it("la contrainte d'exclusion interdit deux reservations fermes qui se chevauchent", async () => {
    const sql = database.sql;
    type Row = { id: string }[];
    const stamp = Date.now();
    const [org] =
      await sql<Row>`insert into public.organizations (name, slug, plan_code) values ('Excl', ${"excl-" + stamp}, 'free') returning id`;
    const orgId = org!.id;
    const [agency] =
      await sql<Row>`insert into public.agencies (organization_id, name, slug) values (${orgId}, 'A', ${"a-" + stamp}) returning id`;
    const agencyId = agency!.id;
    const [vehicle] =
      await sql<Row>`insert into public.vehicles (organization_id, agency_id, brand, model, category, transmission, fuel) values (${orgId}, ${agencyId}, 'Peugeot', '208', 'citadine', 'manuelle', 'essence') returning id`;
    const vehicleId = vehicle!.id;
    const [plan] =
      await sql<Row>`insert into public.rate_plans (vehicle_id, organization_id, daily_cents) values (${vehicleId}, ${orgId}, 5000) returning id`;
    const planId = plan!.id;
    const period = "[2026-10-01 09:00+02,2026-10-04 09:00+02)";
    const [quote] =
      await sql<Row>`insert into public.quotes (user_id, vehicle_id, organization_id, rate_plan_id, pickup_agency_id, period, lines, subtotal_cents, total_cents, currency, expires_at) values (${alice}, ${vehicleId}, ${orgId}, ${planId}, ${agencyId}, ${period}::tstzrange, '[]', 15000, 15000, 'EUR', now() + interval '15 minutes') returning id`;
    const quoteId = quote!.id;
    const insertBooking = (status: string) =>
      sql`insert into public.bookings (organization_id, agency_id, vehicle_id, customer_id, quote_id, period, status, total_cents, currency, price_snapshot) values (${orgId}, ${agencyId}, ${vehicleId}, ${alice}, ${quoteId}, ${period}::tstzrange, ${status}::public.booking_status, 15000, 'EUR', '{}')`;
    await insertBooking("confirmed");
    await expect(insertBooking("confirmed")).rejects.toThrow(/bookings_no_overlap/);
    await insertBooking("requested"); // une demande peut chevaucher, le pro arbitre
    await sql`delete from public.bookings where organization_id = ${orgId}`;
    await sql`delete from public.quotes where organization_id = ${orgId}`;
    await sql`delete from public.organizations where id = ${orgId}`;
  });
});
