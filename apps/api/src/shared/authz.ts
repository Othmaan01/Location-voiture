import { can, type Action, type Actor, type ResourceScope } from "@lv/contracts";

import { forbidden, notFound, unauthenticated } from "./errors.js";

export type { Actor };

/**
 * Point d'entree unique de l'autorisation cote API.
 * - `assertCan` : refuse avec 403 (l'acteur connait l'existence de la ressource).
 * - `assertCanOrHide` : refuse avec 404 (ressource d'une autre organisation : on ne
 *   confirme jamais son existence — anti-enumeration).
 */
export function assertCan(actor: Actor, action: Action, scope: ResourceScope = {}): void {
  if (actor.userId === null && !can(actor, action, scope)) throw unauthenticated();
  if (!can(actor, action, scope)) throw forbidden();
}

export function assertCanOrHide(
  actor: Actor,
  action: Action,
  scope: ResourceScope,
  what?: string,
): void {
  if (actor.userId === null) throw unauthenticated();
  if (!can(actor, action, scope)) throw notFound(what);
}

export const anonymousActor: Actor = Object.freeze({
  userId: null,
  platformRole: null,
  memberships: new Map(),
});
