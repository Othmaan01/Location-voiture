import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUser,
  createTestDatabase,
  createTestKeys,
  createTestServer,
  testDatabaseUrl,
} from "./helpers.js";

/** Catalogue public : feed, profil loueur, recherche par ville et dates, favoris. */
describe.skipIf(!testDatabaseUrl)("catalogue public", () => {
  let database: ReturnType<typeof createTestDatabase>;
  let app: Awaited<ReturnType<typeof createTestServer>>;
  let keys: Awaited<ReturnType<typeof createTestKeys>>;
  let owner: string;
  let customer: string;
  let customerToken: string;
  let orgId: string;
  let vehicleId: string;
  let draftVehicleId: string;
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const stamp = Date.now();

  beforeAll(async () => {
    database = createTestDatabase();
    keys = await createTestKeys();
    app = await createTestServer(database.db, keys.verifyToken);
    owner = await createAuthUser(database.sql, `owner-pub-${stamp}@test.local`);
    customer = await createAuthUser(database.sql, `customer-pub-${stamp}@test.local`);
    customerToken = await keys.sign(customer);
    const sql = database.sql;
    // Organisation verifiee directement en base (le flux de verification est teste ailleurs).
    const [org] = await sql<
      { id: string }[]
    >`insert into public.organizations (name, slug, plan_code, status) values ('Loueur Public', ${"loueur-public-" + stamp}, 'free', 'verified') returning id`;
    orgId = org!.id;
    await sql`insert into public.organization_members (organization_id, user_id, role) values (${orgId}, ${owner}, 'owner')`;
    const [agency] = await sql<
      { id: string }[]
    >`insert into public.agencies (organization_id, name, slug, address_line, postal_code, city_name, latitude, longitude, status) values (${orgId}, 'Agence Lyon', ${"agence-lyon-" + stamp}, '12 rue de la Part-Dieu', '69003', 'Lyon', 45.7640, 4.8357, 'published') returning id`;
    const [vehicle] = await sql<
      { id: string }[]
    >`insert into public.vehicles (organization_id, agency_id, brand, model, category, transmission, fuel, license_plate, status) values (${orgId}, ${agency!.id}, 'Peugeot', '208', 'citadine', 'manuelle', 'essence', 'AB-123-CD', 'published') returning id`;
    vehicleId = vehicle!.id;
    await sql`insert into public.rate_plans (vehicle_id, organization_id, daily_cents, weekly_cents, deposit_cents) values (${vehicleId}, ${orgId}, 4900, 28000, 80000)`;
    const [draft] = await sql<
      { id: string }[]
    >`insert into public.vehicles (organization_id, agency_id, brand, model, category, transmission, fuel, status) values (${orgId}, ${agency!.id}, 'Renault', 'Clio', 'citadine', 'manuelle', 'essence', 'draft') returning id`;
    draftVehicleId = draft!.id;
    // Une reservation confirmee du 20 au 22 octobre : le vehicule est indisponible sur ces dates.
    const [quote] = await sql<
      { id: string }[]
    >`insert into public.quotes (user_id, vehicle_id, organization_id, rate_plan_id, pickup_agency_id, period, lines, subtotal_cents, total_cents, currency, expires_at)
      select ${customer}, ${vehicleId}, ${orgId}, rp.id, ${agency!.id}, tstzrange('2026-10-20 09:00+02', '2026-10-22 09:00+02', '[)'), '[]', 9800, 9800, 'EUR', now() + interval '1 hour' from public.rate_plans rp where rp.vehicle_id = ${vehicleId} returning id`;
    await sql`insert into public.bookings (organization_id, agency_id, vehicle_id, customer_id, quote_id, period, status, total_cents, currency, price_snapshot) values (${orgId}, ${agency!.id}, ${vehicleId}, ${customer}, ${quote!.id}, tstzrange('2026-10-20 09:00+02', '2026-10-22 09:00+02', '[)'), 'confirmed', 9800, 'EUR', '{}')`;
  });

  afterAll(async () => {
    await app.close();
    await database.sql`delete from public.bookings where organization_id = ${orgId}`;
    await database.sql`delete from public.quotes where organization_id = ${orgId}`;
    await database.sql`delete from public.organizations where id = ${orgId}`;
    await database.sql`delete from auth.users where id in (${owner}, ${customer})`;
    await database.close();
  });

  it("le feed liste le loueur verifie avec ses vignettes, sans compte", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/feed?tab=all&limit=50" });
    expect(res.statusCode).toBe(200);
    const item = res
      .json<{
        items: {
          id: string;
          vehicleCount: number;
          fromDailyCents: number | null;
          thumbnails: unknown[];
        }[];
      }>()
      .items.find((i) => i.id === orgId);
    expect(item).toMatchObject({ vehicleCount: 1, fromDailyCents: 4900 });
    expect(item?.thumbnails).toHaveLength(1);
    const nearby = await app.inject({
      method: "GET",
      url: "/v1/feed?tab=nearby&lat=45.75&lng=4.85&radiusKm=20&limit=50",
    });
    expect(
      nearby
        .json<{ items: { id: string; distanceKm: number | null }[] }>()
        .items.find((i) => i.id === orgId)?.distanceKm,
    ).toBeLessThan(5);
    const far = await app.inject({
      method: "GET",
      url: "/v1/feed?tab=nearby&lat=48.85&lng=2.35&radiusKm=20&limit=50",
    });
    expect(
      far.json<{ items: { id: string }[] }>().items.find((i) => i.id === orgId),
    ).toBeUndefined();
    const utility = await app.inject({ method: "GET", url: "/v1/feed?tab=utility&limit=50" });
    expect(
      utility.json<{ items: { id: string }[] }>().items.find((i) => i.id === orgId),
    ).toBeUndefined();
  });

  it("le profil public ne montre que les vehicules publies, sans plaque, avec disponibilite pour des dates", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/loueurs/${orgId}?from=2026-10-20T09:00:00%2B02:00&to=2026-10-21T09:00:00%2B02:00`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      vehicles: { id: string; available: boolean | null }[];
      agencies: unknown[];
    }>();
    expect(body.vehicles.map((v) => v.id)).toEqual([vehicleId]);
    expect(body.vehicles[0]?.available).toBe(false);
    expect(JSON.stringify(body)).not.toContain("AB-123-CD");
    expect(body.agencies).toHaveLength(1);
    const free = await app.inject({
      method: "GET",
      url: `/v1/loueurs/${orgId}?from=2026-11-01T09:00:00%2B01:00&to=2026-11-03T09:00:00%2B01:00`,
    });
    expect(free.json<{ vehicles: { available: boolean | null }[] }>().vehicles[0]?.available).toBe(
      true,
    );
    // Un loueur non verifie n'existe pas publiquement.
    const [hidden] = await database.sql<
      { id: string }[]
    >`insert into public.organizations (name, slug, plan_code, status) values ('Cache', ${"cache-" + stamp}, 'free', 'draft') returning id`;
    expect((await app.inject({ method: "GET", url: `/v1/loueurs/${hidden!.id}` })).statusCode).toBe(
      404,
    );
    await database.sql`delete from public.organizations where id = ${hidden!.id}`;
  });

  it("la recherche filtre par ville, dates (disponibilite reelle) et calcule le total", async () => {
    const byCity = await app.inject({
      method: "GET",
      url: "/v1/search?citySlug=lyon&radiusKm=30&limit=50",
    });
    expect(byCity.statusCode).toBe(200);
    const hit = byCity
      .json<{ items: { id: string; distanceKm: number | null; totalCents: number | null }[] }>()
      .items.find((i) => i.id === vehicleId);
    expect(hit).toBeDefined();
    expect(hit?.totalCents).toBeNull();

    const busy = await app.inject({
      method: "GET",
      url: "/v1/search?citySlug=lyon&from=2026-10-20T09:00:00%2B02:00&to=2026-10-23T09:00:00%2B02:00&limit=50",
    });
    expect(
      busy.json<{ items: { id: string }[] }>().items.find((i) => i.id === vehicleId),
    ).toBeUndefined();

    const dated = await app.inject({
      method: "GET",
      url: "/v1/search?citySlug=lyon&from=2026-11-01T09:00:00%2B01:00&to=2026-11-10T09:00:00%2B01:00&limit=50",
    });
    const item = dated
      .json<{ items: { id: string; totalCents: number | null; days: number | null }[] }>()
      .items.find((i) => i.id === vehicleId);
    expect(item?.days).toBe(9);
    expect(item?.totalCents).toBe(28000 + 2 * 4900); // forfait semaine + 2 jours

    const paris = await app.inject({
      method: "GET",
      url: "/v1/search?citySlug=paris&radiusKm=30&limit=50",
    });
    expect(
      paris.json<{ items: { id: string }[] }>().items.find((i) => i.id === vehicleId),
    ).toBeUndefined();
    const bad = await app.inject({ method: "GET", url: "/v1/search?from=2026-11-01T09:00:00Z" });
    expect(bad.statusCode).toBe(422);
  });

  it("stories : bulles publiques composees du neuf (vehicule recent) et d'une story manuelle 48 h", async () => {
    const ownerToken = await keys.sign(owner);
    const forbidden = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/stories/upload-url`,
      headers: auth(customerToken),
      payload: { mimeType: "image/jpeg", sizeBytes: 120_000 },
    });
    expect(forbidden.statusCode).toBe(404);
    const upload = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/stories/upload-url`,
      headers: auth(ownerToken),
      payload: { mimeType: "image/jpeg", sizeBytes: 120_000 },
    });
    expect(upload.statusCode).toBe(200);
    const { path } = upload.json<{ path: string }>();
    expect(path.startsWith(`branding/${orgId}/story-`)).toBe(true);
    const created = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/stories`,
      headers: auth(ownerToken),
      payload: { path, caption: "Promo du week-end" },
    });
    expect(created.statusCode).toBe(201);
    const story = created.json<{ id: string; caption: string; expiresAt: string }>();
    expect(story.caption).toBe("Promo du week-end");
    expect(new Date(story.expiresAt).getTime() - Date.now()).toBeGreaterThan(47 * 3600 * 1000);

    const feed = await app.inject({ method: "GET", url: "/v1/stories" });
    expect(feed.statusCode).toBe(200);
    const group = feed
      .json<{
        groups: {
          organizationId: string;
          highlight: string;
          items: { id: string; kind: string; title: string }[];
        }[];
      }>()
      .groups.find((g) => g.organizationId === orgId);
    expect(group).toBeDefined();
    expect(group!.highlight).toBe("story");
    expect(group!.items.map((i) => i.kind)).toEqual(
      expect.arrayContaining(["story", "new_vehicle"]),
    );
    // Le brouillon n'apparait jamais ; le vehicule publie recent oui.
    expect(group!.items.find((i) => i.id === `vehicle:${draftVehicleId}`)).toBeUndefined();
    expect(group!.items.find((i) => i.id === `vehicle:${vehicleId}`)?.title).toBe("Peugeot 208");

    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/stories/${story.id}`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/stories/${story.id}`,
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(204);
  });

  it("favoris : reserve aux connectes, uniquement des vehicules publies", async () => {
    expect(
      (await app.inject({ method: "PUT", url: `/v1/me/favorites/${vehicleId}` })).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/v1/me/favorites/${draftVehicleId}`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/v1/me/favorites/${vehicleId}`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/v1/me/favorites/${vehicleId}`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(204);
    const list = await app.inject({
      method: "GET",
      url: "/v1/me/favorites",
      headers: auth(customerToken),
    });
    expect(list.json<{ vehicles: { id: string; loueurName: string }[] }>().vehicles).toEqual([
      expect.objectContaining({ id: vehicleId, loueurName: "Loueur Public" }),
    ]);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/me/favorites/${vehicleId}`,
          headers: auth(customerToken),
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await app.inject({ method: "GET", url: "/v1/me/favorites", headers: auth(customerToken) })
      ).json<{ vehicles: unknown[] }>().vehicles,
    ).toHaveLength(0);
  });
});
