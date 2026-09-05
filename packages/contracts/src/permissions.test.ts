import { describe, expect, it } from "vitest";

import { can, type Actor } from "./permissions.js";

const ORG_A = "org-a";
const ORG_B = "org-b";

const actor = (overrides: Partial<Actor>): Actor => ({
  userId: "user-1",
  platformRole: null,
  memberships: new Map(),
  ...overrides,
});

describe("authz.can — matrice de permissions", () => {
  it("un visiteur ne peut que lire le catalogue", () => {
    const anon = actor({ userId: null });
    expect(can(anon, "catalog.read")).toBe(true);
    expect(can(anon, "booking.create")).toBe(false);
    expect(can(anon, "organization.read", { organizationId: ORG_A })).toBe(false);
  });

  it("un client cree une reservation et ne lit que les siennes", () => {
    const customer = actor({});
    expect(can(customer, "booking.create")).toBe(true);
    expect(can(customer, "booking.read_own", { ownerUserId: "user-1" })).toBe(true);
    expect(can(customer, "booking.read_own", { ownerUserId: "user-2" })).toBe(false);
    expect(can(customer, "booking.read_org", { organizationId: ORG_A })).toBe(false);
  });

  it("un agent decide des reservations de son organisation, pas des autres (IDOR)", () => {
    const agent = actor({ memberships: new Map([[ORG_A, "agent"]]) });
    expect(can(agent, "booking.decide", { organizationId: ORG_A })).toBe(true);
    expect(can(agent, "booking.decide", { organizationId: ORG_B })).toBe(false);
    expect(can(agent, "vehicle.write", { organizationId: ORG_A })).toBe(false);
    expect(can(agent, "rate_plan.write", { organizationId: ORG_A })).toBe(false);
  });

  it("un manager gere les vehicules mais pas les membres", () => {
    const manager = actor({ memberships: new Map([[ORG_A, "manager"]]) });
    expect(can(manager, "vehicle.write", { organizationId: ORG_A })).toBe(true);
    expect(can(manager, "vehicle.publish", { organizationId: ORG_A })).toBe(true);
    expect(can(manager, "organization.members.manage", { organizationId: ORG_A })).toBe(false);
    expect(can(manager, "organization.documents.read", { organizationId: ORG_A })).toBe(false);
  });

  it("un owner gere tout dans son organisation, rien ailleurs", () => {
    const owner = actor({ memberships: new Map([[ORG_A, "owner"]]) });
    expect(can(owner, "organization.members.manage", { organizationId: ORG_A })).toBe(true);
    expect(can(owner, "organization.members.manage", { organizationId: ORG_B })).toBe(false);
    expect(can(owner, "organization.verify", { organizationId: ORG_A })).toBe(false);
  });

  it("un membre d'organisation n'est pas un client pour autant", () => {
    const owner = actor({ memberships: new Map([[ORG_A, "owner"]]) });
    // Il peut toujours reserver en tant que particulier : c'est voulu (un pro peut louer ailleurs).
    expect(can(owner, "booking.create")).toBe(true);
  });

  it("support verifie et lit les documents, ne suspend pas ; admin suspend ; seul superadmin gere les roles", () => {
    const support = actor({ platformRole: "support" });
    const admin = actor({ platformRole: "admin" });
    const superadmin = actor({ platformRole: "superadmin" });
    expect(can(support, "organization.verify", { organizationId: ORG_B })).toBe(true);
    expect(can(support, "organization.suspend", { organizationId: ORG_B })).toBe(false);
    expect(can(admin, "organization.suspend", { organizationId: ORG_B })).toBe(true);
    expect(can(admin, "platform.roles.manage")).toBe(false);
    expect(can(superadmin, "platform.roles.manage")).toBe(true);
  });

  it("un role plateforme ne donne jamais le droit d'ecrire dans une organisation", () => {
    const admin = actor({ platformRole: "admin" });
    expect(can(admin, "vehicle.write", { organizationId: ORG_A })).toBe(false);
    expect(can(admin, "booking.decide", { organizationId: ORG_A })).toBe(false);
  });
});
