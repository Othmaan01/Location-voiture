import type { OrganizationRole, PlatformRole } from "./enums.js";

/**
 * Matrice de permissions — source de verite (ADR-0007).
 * Evaluee cote serveur par authz.can(); le mobile ne s'en sert que pour
 * afficher ou masquer des actions, jamais pour securiser quoi que ce soit.
 */
export const ACTIONS = [
  "catalog.read",
  "booking.create",
  "booking.read_own",
  "booking.read_org",
  "booking.decide",
  "vehicle.read_org",
  "vehicle.write",
  "vehicle.publish",
  "rate_plan.write",
  "availability.write",
  "organization.read",
  "organization.write",
  "organization.members.manage",
  "organization.documents.write",
  "organization.documents.read",
  "organization.verify",
  "vehicle.suspend",
  "organization.suspend",
  "platform.roles.manage",
] as const;
export type Action = (typeof ACTIONS)[number];

/** Ce que peut faire un membre d'organisation, sur SA propre organisation. */
export const ORGANIZATION_PERMISSIONS: Record<OrganizationRole, ReadonlySet<Action>> = {
  agent: new Set<Action>([
    "catalog.read",
    "organization.read",
    "booking.read_org",
    "booking.decide",
    "vehicle.read_org",
    "availability.write",
  ]),
  manager: new Set<Action>([
    "catalog.read",
    "organization.read",
    "booking.read_org",
    "booking.decide",
    "vehicle.read_org",
    "vehicle.write",
    "vehicle.publish",
    "rate_plan.write",
    "availability.write",
    "organization.documents.write",
  ]),
  owner: new Set<Action>([
    "catalog.read",
    "organization.read",
    "organization.write",
    "organization.members.manage",
    "booking.read_org",
    "booking.decide",
    "vehicle.read_org",
    "vehicle.write",
    "vehicle.publish",
    "rate_plan.write",
    "availability.write",
    "organization.documents.write",
    "organization.documents.read",
  ]),
};

/** Ce que peut faire un role plateforme, sur N'IMPORTE quelle organisation. */
export const PLATFORM_PERMISSIONS: Record<PlatformRole, ReadonlySet<Action>> = {
  support: new Set<Action>([
    "catalog.read",
    "organization.read",
    "booking.read_own",
    "booking.read_org",
    "vehicle.read_org",
    "organization.documents.read",
    "organization.verify",
  ]),
  admin: new Set<Action>([
    "catalog.read",
    "organization.read",
    "booking.read_own",
    "booking.read_org",
    "vehicle.read_org",
    "organization.documents.read",
    "organization.verify",
    "organization.suspend",
    "vehicle.suspend",
  ]),
  superadmin: new Set<Action>([
    "catalog.read",
    "organization.read",
    "booking.read_own",
    "booking.read_org",
    "vehicle.read_org",
    "organization.documents.read",
    "organization.verify",
    "organization.suspend",
    "vehicle.suspend",
    "platform.roles.manage",
  ]),
};

/** Un utilisateur authentifie sans aucun role : le client. */
export const CUSTOMER_PERMISSIONS: ReadonlySet<Action> = new Set<Action>([
  "catalog.read",
  "booking.create",
  "booking.read_own",
]);

/** Un visiteur non authentifie. */
export const ANONYMOUS_PERMISSIONS: ReadonlySet<Action> = new Set<Action>(["catalog.read"]);

export interface Actor {
  userId: string | null;
  platformRole: PlatformRole | null;
  /** organizationId -> role */
  memberships: ReadonlyMap<string, OrganizationRole>;
}

export interface ResourceScope {
  /** Organisation proprietaire de la ressource, s'il y en a une. */
  organizationId?: string | null;
  /** Utilisateur proprietaire de la ressource (client), s'il y en a un. */
  ownerUserId?: string | null;
}

/**
 * Decision d'autorisation pure, sans I/O.
 * Regle : un acteur obtient une action si (a) son role plateforme l'accorde,
 * (b) il est membre de l'organisation de la ressource avec un role qui l'accorde,
 * (c) c'est une action client et il est proprietaire de la ressource (ou action sans ressource).
 */
export function can(actor: Actor, action: Action, scope: ResourceScope = {}): boolean {
  if (actor.userId === null) {
    return ANONYMOUS_PERMISSIONS.has(action);
  }
  if (actor.platformRole && PLATFORM_PERMISSIONS[actor.platformRole].has(action)) {
    return true;
  }
  if (scope.organizationId) {
    const role = actor.memberships.get(scope.organizationId);
    if (role && ORGANIZATION_PERMISSIONS[role].has(action)) {
      return true;
    }
  }
  if (CUSTOMER_PERMISSIONS.has(action)) {
    if (scope.ownerUserId === undefined || scope.ownerUserId === null) {
      return true;
    }
    return scope.ownerUserId === actor.userId;
  }
  return false;
}
