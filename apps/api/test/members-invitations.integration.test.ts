import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUser,
  createTestDatabase,
  createTestKeys,
  createTestServer,
  testDatabaseUrl,
} from "./helpers.js";

describe.skipIf(!testDatabaseUrl)("membres, invitations, appareils, suppression de compte", () => {
  let database: ReturnType<typeof createTestDatabase>;
  let app: Awaited<ReturnType<typeof createTestServer>>;
  let keys: Awaited<ReturnType<typeof createTestKeys>>;
  let owner: string;
  let invitee: string;
  let stranger: string;
  let ownerToken: string;
  let inviteeToken: string;
  let strangerToken: string;
  let inviteeEmail: string;
  let orgId: string;

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    database = createTestDatabase();
    keys = await createTestKeys();
    app = await createTestServer(database.db, keys.verifyToken);
    const stamp = Date.now();
    inviteeEmail = `invitee-${stamp}@test.local`;
    owner = await createAuthUser(database.sql, `owner-${stamp}@test.local`);
    invitee = await createAuthUser(database.sql, inviteeEmail);
    stranger = await createAuthUser(database.sql, `stranger-${stamp}@test.local`);
    ownerToken = await keys.sign(owner, { email: `owner-${stamp}@test.local` });
    inviteeToken = await keys.sign(invitee, { email: inviteeEmail });
    strangerToken = await keys.sign(stranger, { email: `stranger-${stamp}@test.local` });
    const created = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: auth(ownerToken),
      payload: { name: "Org Invitations" },
    });
    orgId = created.json<{ id: string }>().id;
  });

  afterAll(async () => {
    await app.close();
    await database.sql`delete from public.organizations where id = ${orgId}::uuid`;
    await database.sql`delete from auth.users where id in (${owner}, ${invitee}, ${stranger})`;
    await database.close();
  });

  it("le proprietaire invite un manager ; le jeton n'est jamais stocke en clair", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/invitations`,
      headers: auth(ownerToken),
      payload: { email: inviteeEmail.toUpperCase(), role: "manager" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ token: string; link: string; email: string }>();
    expect(body.link).toBe(`lv://invitations/${body.token}`);
    expect(body.email).toBe(inviteeEmail);
    const rows = await database.sql<
      { token_hash: string }[]
    >`select token_hash from public.organization_invitations where organization_id = ${orgId}::uuid`;
    expect(rows[0]?.token_hash).not.toBe(body.token);
    expect(rows[0]?.token_hash).toHaveLength(64);

    // Un autre compte que l'invite ne peut pas accepter, meme avec le bon jeton.
    const wrongUser = await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: auth(strangerToken),
      payload: { token: body.token },
    });
    expect(wrongUser.statusCode).toBe(404);

    const accepted = await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: auth(inviteeToken),
      payload: { token: body.token },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ organizationId: orgId, role: "manager" });

    // Un jeton consomme ne sert plus.
    const replay = await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: auth(inviteeToken),
      payload: { token: body.token },
    });
    expect(replay.statusCode).toBe(404);
  });

  it("un manager voit les membres mais ne peut ni inviter ni changer un role", async () => {
    const members = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/members`,
      headers: auth(inviteeToken),
    });
    expect(members.statusCode).toBe(200);
    expect(members.json<{ members: { userId: string; role: string }[] }>().members).toHaveLength(2);

    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/invitations`,
      headers: auth(inviteeToken),
      payload: { email: "x@test.local", role: "agent" },
    });
    expect(invite.statusCode).toBe(403);
    const role = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${orgId}/members/${owner}`,
      headers: auth(inviteeToken),
      payload: { role: "agent" },
    });
    expect(role.statusCode).toBe(403);
    // Un etranger : 404, pas 403.
    const strangerList = await app.inject({
      method: "GET",
      url: `/v1/organizations/${orgId}/invitations`,
      headers: auth(strangerToken),
    });
    expect(strangerList.statusCode).toBe(404);
  });

  it("une organisation ne perd jamais son dernier proprietaire (409)", async () => {
    const demote = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${orgId}/members/${owner}`,
      headers: auth(ownerToken),
      payload: { role: "agent" },
    });
    expect(demote.statusCode).toBe(409);
    const leave = await app.inject({
      method: "DELETE",
      url: `/v1/organizations/${orgId}/members/${owner}`,
      headers: auth(ownerToken),
    });
    expect(leave.statusCode).toBe(409);
  });

  it("un jeton d'appareil change de proprietaire s'il est re-enregistre par un autre compte", async () => {
    const token = `ExponentPushToken[test-${Date.now()}]`;
    const a = await app.inject({
      method: "PUT",
      url: "/v1/devices",
      headers: auth(ownerToken),
      payload: { platform: "ios", token },
    });
    expect(a.statusCode).toBe(200);
    const b = await app.inject({
      method: "PUT",
      url: "/v1/devices",
      headers: auth(inviteeToken),
      payload: { platform: "ios", token },
    });
    expect(b.statusCode).toBe(200);
    const rows = await database.sql<
      { user_id: string }[]
    >`select user_id from public.device_tokens where token = ${token}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe(invitee);
    const del = await app.inject({
      method: "DELETE",
      url: `/v1/devices/${encodeURIComponent(token)}`,
      headers: auth(inviteeToken),
    });
    expect(del.statusCode).toBe(204);
  });

  it("la suppression de compte est refusee au proprietaire d'une organisation a plusieurs membres, puis anonymise le profil", async () => {
    const refused = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: auth(ownerToken),
      payload: { confirmation: "SUPPRIMER" },
    });
    expect(refused.statusCode).toBe(409);
    const badConfirmation = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: auth(strangerToken),
      payload: { confirmation: "oui" },
    });
    expect(badConfirmation.statusCode).toBe(422);

    await app.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: auth(strangerToken),
      payload: { firstName: "Jean", phone: "+33612345678" },
    });
    const ok = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: auth(strangerToken),
      payload: { confirmation: "SUPPRIMER" },
    });
    expect(ok.statusCode).toBe(204);
    const rows = await database.sql<
      {
        first_name: string | null;
        phone: string | null;
        deleted_at: string | null;
        auth_deleted_at: string | null;
      }[]
    >`select first_name, phone, deleted_at, auth_deleted_at from public.profiles where id = ${stranger}`;
    expect(rows[0]).toMatchObject({ first_name: null, phone: null });
    expect(rows[0]?.deleted_at).not.toBeNull();
    expect(rows[0]?.auth_deleted_at).not.toBeNull();
  });
});
