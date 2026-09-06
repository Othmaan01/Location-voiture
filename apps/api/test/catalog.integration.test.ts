import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUser,
  createTestDatabase,
  createTestKeys,
  createTestServer,
  testDatabaseUrl,
} from "./helpers.js";

/**
 * Parcours professionnel complet : organisation -> agence -> vehicule -> tarif -> photos
 * -> documents -> soumission -> decision admin -> publication. Plus les regles d'acces.
 */
describe.skipIf(!testDatabaseUrl)("catalogue, documents, verification, administration", () => {
  let database: ReturnType<typeof createTestDatabase>;
  let app: Awaited<ReturnType<typeof createTestServer>>;
  let keys: Awaited<ReturnType<typeof createTestKeys>>;
  let owner: string;
  let stranger: string;
  let admin: string;
  let ownerToken: string;
  let strangerToken: string;
  let adminToken: string;
  let orgId: string;
  let agencyId: string;
  let vehicleId: string;
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    database = createTestDatabase();
    keys = await createTestKeys();
    app = await createTestServer(database.db, keys.verifyToken);
    const stamp = Date.now();
    owner = await createAuthUser(database.sql, `owner-cat-${stamp}@test.local`);
    stranger = await createAuthUser(database.sql, `stranger-cat-${stamp}@test.local`);
    admin = await createAuthUser(database.sql, `admin-cat-${stamp}@test.local`);
    await database.sql`insert into public.platform_roles (user_id, role) values (${admin}, 'admin')`;
    ownerToken = await keys.sign(owner);
    strangerToken = await keys.sign(stranger);
    adminToken = await keys.sign(admin, { aal: "aal2" });
    const created = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: auth(ownerToken),
      payload: { name: "Catalogue Test", siren: "443061841" },
    });
    orgId = created.json<{ id: string }>().id;
  });

  afterAll(async () => {
    await app.close();
    if (orgId) await database.sql`delete from public.organizations where id = ${orgId}::uuid`;
    await database.sql`delete from auth.users where id in (${owner}, ${stranger}, ${admin})`;
    await database.close();
  });

  it("cree une agence, refuse sa publication tant que l'organisation n'est pas verifiee", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/agencies`,
      headers: auth(ownerToken),
      payload: {
        name: "Agence Part-Dieu",
        siret: "44306184100047",
        addressLine: "12 rue de la Part-Dieu",
        postalCode: "69003",
        cityName: "Lyon",
        latitude: 45.76,
        longitude: 4.86,
        phone: "+33 4 00 00 00 00",
      },
    });
    expect(res.statusCode).toBe(201);
    agencyId = res.json<{ id: string }>().id;
    // SIRET d'une autre entreprise : refuse (doit commencer par le SIREN de l'organisation)
    const foreign = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/agencies`,
      headers: auth(ownerToken),
      payload: { name: "Autre", siret: "73282932000074" },
    });
    expect(foreign.statusCode).toBe(422);
    expect(foreign.json()).toMatchObject({ error: { details: { blocker: "siret_mismatch" } } });
    // Agence sans vehicule : supprimable ; l'agence principale avec vehicules ne le sera pas (teste plus bas)
    const spare = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/agencies`,
      headers: auth(ownerToken),
      payload: { name: "Temporaire" },
    });
    expect(spare.statusCode).toBe(201);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/agencies/${spare.json<{ id: string }>().id}`,
          headers: auth(strangerToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/v1/agencies/${spare.json<{ id: string }>().id}`,
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(204);
    const publish = await app.inject({
      method: "POST",
      url: `/v1/agencies/${agencyId}/publish`,
      headers: auth(ownerToken),
    });
    expect(publish.statusCode).toBe(409);
    expect(publish.json()).toMatchObject({
      error: { details: { blocker: "organization_not_verified" } },
    });
    // IDOR : un etranger ne voit ni ne modifie l'agence
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/v1/agencies/${agencyId}`,
          headers: auth(strangerToken),
          payload: { name: "Hack" },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/organizations/${orgId}/agencies`,
          headers: auth(strangerToken),
        })
      ).statusCode,
    ).toBe(404);
  });

  it("cree un vehicule, liste les bloqueurs de publication, pose un tarif", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/vehicles`,
      headers: auth(ownerToken),
      payload: {
        agencyId,
        brand: "Peugeot",
        model: "208",
        category: "citadine",
        transmission: "manuelle",
        fuel: "essence",
        licensePlate: "AB-123-CD",
      },
    });
    expect(res.statusCode).toBe(201);
    vehicleId = res.json<{ id: string }>().id;

    // Un vehicule ne peut pas etre rattache a l'agence d'une autre organisation.
    const [foreign] = await database.sql<
      { id: string }[]
    >`insert into public.organizations (name, slug, plan_code) values ('Autre', ${"autre-" + Date.now()}, 'free') returning id`;
    const [foreignAgency] = await database.sql<
      { id: string }[]
    >`insert into public.agencies (organization_id, name, slug) values (${foreign!.id}, 'X', ${"x-" + Date.now()}) returning id`;
    const cross = await app.inject({
      method: "PATCH",
      url: `/v1/vehicles/${vehicleId}`,
      headers: auth(ownerToken),
      payload: { agencyId: foreignAgency!.id },
    });
    expect(cross.statusCode).toBe(422);
    await database.sql`delete from public.organizations where id = ${foreign!.id}`;

    const check = await app.inject({
      method: "GET",
      url: `/v1/vehicles/${vehicleId}/publish-check`,
      headers: auth(ownerToken),
    });
    expect(check.json()).toMatchObject({ canPublish: false });
    expect(check.json<{ blockers: string[] }>().blockers).toEqual(
      expect.arrayContaining(["organization_not_verified", "no_photo", "no_rate_plan"]),
    );

    const plan = await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/rate-plan`,
      headers: auth(ownerToken),
      payload: {
        dailyCents: 4900,
        weeklyCents: 28000,
        depositCents: 80000,
        kmIncludedPerDay: 200,
        extraKmCents: 25,
      },
    });
    expect(plan.statusCode).toBe(200);
    expect(plan.json()).toMatchObject({ dailyCents: 4900, currency: "EUR" });
    const bad = await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/rate-plan`,
      headers: auth(ownerToken),
      payload: { dailyCents: 49.5 },
    });
    expect(bad.statusCode).toBe(422);
    // Un seul plan actif : la seconde pose remplace la premiere.
    await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/rate-plan`,
      headers: auth(ownerToken),
      payload: { dailyCents: 5900 },
    });
    const active = await database.sql<
      { n: number }[]
    >`select count(*)::int as n from public.rate_plans where vehicle_id = ${vehicleId} and is_active`;
    expect(active[0]?.n).toBe(1);
  });

  it("photos : URL signee, confirmation liee au vehicule, reordonnancement, suppression", async () => {
    const up = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/photos/upload-url`,
      headers: auth(ownerToken),
      payload: { mimeType: "image/jpeg", sizeBytes: 1200 },
    });
    expect(up.statusCode).toBe(200);
    const { path } = up.json<{ path: string }>();
    expect(path.startsWith(`${orgId}/${vehicleId}/`)).toBe(true);

    // Un chemin non emis (ou d'un autre vehicule) est refuse.
    const forged = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/photos`,
      headers: auth(ownerToken),
      payload: { path: `${orgId}/${vehicleId}/forged.jpg` },
    });
    expect(forged.statusCode).toBe(404);

    const p1 = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/photos`,
      headers: auth(ownerToken),
      payload: { path, width: 1600, height: 1200 },
    });
    expect(p1.statusCode).toBe(201);
    const up2 = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/photos/upload-url`,
      headers: auth(ownerToken),
      payload: { mimeType: "image/webp", sizeBytes: 900 },
    });
    const p2 = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/photos`,
      headers: auth(ownerToken),
      payload: { path: up2.json<{ path: string }>().path },
    });
    const id1 = p1.json<{ id: string; position: number }>();
    const id2 = p2.json<{ id: string; position: number }>();
    expect([id1.position, id2.position]).toEqual([0, 1]);

    const order = await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/photos/order`,
      headers: auth(ownerToken),
      payload: { photoIds: [id2.id, id1.id] },
    });
    expect(order.statusCode).toBe(200);
    expect(order.json<{ photos: { id: string }[] }>().photos.map((p) => p.id)).toEqual([
      id2.id,
      id1.id,
    ]);
    const partial = await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/photos/order`,
      headers: auth(ownerToken),
      payload: { photoIds: [id1.id] },
    });
    expect(partial.statusCode).toBe(422);

    const del = await app.inject({
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/photos/${id2.id}`,
      headers: auth(ownerToken),
    });
    expect(del.statusCode).toBe(204);
    const v = await app.inject({
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      headers: auth(ownerToken),
    });
    expect(v.json<{ photos: { position: number }[] }>().photos.map((p) => p.position)).toEqual([0]);
  });

  it("un vehicule non publie est invisible du public ; la plaque n'est jamais publique", async () => {
    const anon = await app.inject({ method: "GET", url: `/v1/vehicles/${vehicleId}` });
    expect(anon.statusCode).toBe(404);
    const stranger = await app.inject({
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      headers: auth(strangerToken),
    });
    expect(stranger.statusCode).toBe(404);
  });

  it("documents : depot par le manager+, lecture par URL signee journalisee, soumission de verification", async () => {
    const status0 = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/verification`,
      headers: auth(ownerToken),
    });
    expect(status0.json<{ missing: string[] }>().missing).toEqual(
      expect.arrayContaining(["kbis", "insurance"]),
    );
    const early = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/verification/submit`,
      headers: auth(ownerToken),
    });
    expect(early.statusCode).toBe(409);

    for (const kind of ["kbis", "insurance"] as const) {
      const up = await app.inject({
        method: "POST",
        url: `/v1/organizations/${orgId}/documents/upload-url`,
        headers: auth(ownerToken),
        payload: { kind, mimeType: "application/pdf", sizeBytes: 5000 },
      });
      expect(up.statusCode).toBe(200);
      const confirm = await app.inject({
        method: "POST",
        url: `/v1/organizations/${orgId}/documents`,
        headers: auth(ownerToken),
        payload: { path: up.json<{ path: string }>().path, kind },
      });
      expect(confirm.statusCode).toBe(201);
      expect(confirm.json()).toMatchObject({ kind, status: "pending" });
    }
    const list = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/documents`,
      headers: auth(ownerToken),
    });
    const docs = list.json<{ documents: { id: string }[] }>().documents;
    expect(docs).toHaveLength(2);

    // Lecture : owner ok et journalisee ; etranger 404.
    const url = await app.inject({
      method: "GET",
      url: `/v1/documents/${docs[0]!.id}/url`,
      headers: auth(ownerToken),
    });
    expect(url.statusCode).toBe(200);
    expect(url.json<{ url: string }>().url).toContain("/signed/documents/");
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/documents/${docs[0]!.id}/url`,
          headers: auth(strangerToken),
        })
      ).statusCode,
    ).toBe(404);
    const log = await database.sql<
      { n: number }[]
    >`select count(*)::int as n from public.document_access_log where document_id = ${docs[0]!.id}`;
    expect(log[0]?.n).toBe(1);

    const submit = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/verification/submit`,
      headers: auth(ownerToken),
    });
    expect(submit.statusCode).toBe(204);
    const again = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/verification/submit`,
      headers: auth(ownerToken),
    });
    expect(again.statusCode).toBe(409);
  });

  it("administration : file de verification reservee au staff, decision, puis publication possible", async () => {
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/v1/admin/verifications",
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(403);
    const queue = await app.inject({
      method: "GET",
      url: "/v1/admin/verifications",
      headers: auth(adminToken),
    });
    expect(queue.statusCode).toBe(200);
    const item = queue
      .json<{ items: { organizationId: string; documents: unknown[] }[] }>()
      .items.find((i) => i.organizationId === orgId);
    expect(item?.documents).toHaveLength(2);

    const badReject = await app.inject({
      method: "POST",
      url: `/v1/admin/verifications/${orgId}/decision`,
      headers: auth(adminToken),
      payload: { decision: "rejected" },
    });
    expect(badReject.statusCode).toBe(422);
    const decide = await app.inject({
      method: "POST",
      url: `/v1/admin/verifications/${orgId}/decision`,
      headers: auth(adminToken),
      payload: { decision: "verified", notes: "Kbis et assurance conformes" },
    });
    expect(decide.statusCode).toBe(204);
    const status = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/verification`,
      headers: auth(ownerToken),
    });
    expect(status.json()).toMatchObject({ status: "verified" });
    const accepted = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/documents`,
      headers: auth(ownerToken),
    });
    expect(
      accepted
        .json<{ documents: { status: string }[] }>()
        .documents.every((d) => d.status === "accepted"),
    ).toBe(true);

    const agencyPub = await app.inject({
      method: "POST",
      url: `/v1/agencies/${agencyId}/publish`,
      headers: auth(ownerToken),
    });
    expect(agencyPub.statusCode).toBe(200);
    const pub = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${vehicleId}/publish`,
      headers: auth(ownerToken),
    });
    expect(pub.statusCode).toBe(200);
    expect(pub.json()).toMatchObject({ status: "published" });

    // Vue publique : visible, sans plaque.
    const anon = await app.inject({ method: "GET", url: `/v1/vehicles/${vehicleId}` });
    expect(anon.statusCode).toBe(200);
    expect(anon.json()).toMatchObject({ licensePlate: null, status: "published" });
    const member = await app.inject({
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      headers: auth(ownerToken),
    });
    expect(member.json()).toMatchObject({ licensePlate: "AB-123-CD" });

    // Quota : on place l'organisation sur l'ancienne offre a 1 vehicule pour tester la limite.
    await database.sql`update public.organizations set plan_code = 'free' where id = ${orgId}::uuid`;
    const second = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/vehicles`,
      headers: auth(ownerToken),
      payload: {
        agencyId,
        brand: "Renault",
        model: "Clio",
        category: "citadine",
        transmission: "manuelle",
        fuel: "essence",
      },
    });
    const secondId = second.json<{ id: string }>().id;
    await app.inject({
      method: "PUT",
      url: `/v1/vehicles/${secondId}/rate-plan`,
      headers: auth(ownerToken),
      payload: { dailyCents: 3900 },
    });
    const up = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${secondId}/photos/upload-url`,
      headers: auth(ownerToken),
      payload: { mimeType: "image/jpeg", sizeBytes: 100 },
    });
    await app.inject({
      method: "POST",
      url: `/v1/vehicles/${secondId}/photos`,
      headers: auth(ownerToken),
      payload: { path: up.json<{ path: string }>().path },
    });
    const quota = await app.inject({
      method: "POST",
      url: `/v1/vehicles/${secondId}/publish`,
      headers: auth(ownerToken),
    });
    expect(quota.statusCode).toBe(409);
    expect(quota.json()).toMatchObject({ error: { details: { blockers: ["quota_reached"] } } });
    await database.sql`update public.organizations set plan_code = 'starter' where id = ${orgId}::uuid`;

    // Suspension plateforme : le vehicule disparait du public.
    const susp = await app.inject({
      method: "POST",
      url: `/v1/admin/vehicles/${vehicleId}/suspension`,
      headers: auth(adminToken),
      payload: { suspend: true, reason: "Photos non conformes" },
    });
    expect(susp.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: `/v1/vehicles/${vehicleId}` })).statusCode).toBe(
      404,
    );
  });

  it("agence avec vehicules : suppression refusee (409) ; vehicule sans reservation : vraiment supprime", async () => {
    const blocked = await app.inject({
      method: "DELETE",
      url: `/v1/agencies/${agencyId}`,
      headers: auth(ownerToken),
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({ error: { details: { blocker: "has_vehicles" } } });

    const created = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/vehicles`,
      headers: auth(ownerToken),
      payload: {
        agencyId,
        brand: "Renault",
        model: "Clio",
        category: "citadine",
        transmission: "manuelle",
        fuel: "essence",
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: string }>().id;
    const removed = await app.inject({
      method: "DELETE",
      url: `/v1/vehicles/${id}`,
      headers: auth(ownerToken),
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ outcome: "deleted" });
    const rows = await database.sql<
      { n: string }[]
    >`select count(*)::text as n from public.vehicles where id = ${id}::uuid`;
    expect(rows[0]?.n).toBe("0");
  });

  it("administration : liste des loueurs avec filtre et recherche, refusee sans role", async () => {
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/v1/admin/organizations",
          headers: auth(ownerToken),
        })
      ).statusCode,
    ).toBe(403);
    const all = await app.inject({
      method: "GET",
      url: "/v1/admin/organizations?q=Catalogue",
      headers: auth(adminToken),
    });
    expect(all.statusCode).toBe(200);
    const items = all.json<{ items: { id: string; agencyCount: number; planCode: string }[] }>()
      .items;
    const mine = items.find((i) => i.id === orgId);
    expect(mine).toBeDefined();
    expect(mine?.agencyCount).toBeGreaterThanOrEqual(1);
    expect(mine?.planCode).toBe("starter");
  });
});
