import { eq } from "drizzle-orm";
import type { OrganizationRole } from "@lv/contracts";

import type { Database } from "../db/client.js";
import { organizationMembers, platformRoles } from "../db/schema.js";
import type { Actor } from "./authz.js";

/**
 * Charge l'acteur complet (role plateforme + appartenances) depuis la base.
 * Toujours lu en base a chaque requete : un role retire prend effet
 * immediatement, sans attendre l'expiration d'un token.
 */
export async function loadActor(db: Database, userId: string): Promise<Actor> {
  const [roleRows, memberRows] = await Promise.all([
    db
      .select({ role: platformRoles.role })
      .from(platformRoles)
      .where(eq(platformRoles.userId, userId)),
    db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId)),
  ]);
  const memberships = new Map<string, OrganizationRole>();
  for (const row of memberRows) memberships.set(row.organizationId, row.role);
  return {
    userId,
    platformRole: roleRows[0]?.role ?? null,
    memberships,
  };
}
