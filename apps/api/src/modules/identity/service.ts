import { and, eq } from "drizzle-orm";
import type { MeResponse, UpdateProfileBody } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  deviceTokens,
  favorites,
  organizationMembers,
  organizations,
  profiles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import type { Actor } from "../../shared/authz.js";
import { DomainError } from "../../shared/errors.js";
import type { SupabaseAdmin } from "../../shared/supabase-admin.js";

export interface IdentityService {
  me(actor: Actor, email: string | null): Promise<MeResponse>;
  updateProfile(
    actor: Actor,
    email: string | null,
    body: UpdateProfileBody,
    requestId: string,
  ): Promise<MeResponse>;
  deleteAccount(actor: Actor, requestId: string): Promise<void>;
}

export function createIdentityService(db: Database, supabaseAdmin: SupabaseAdmin): IdentityService {
  async function me(actor: Actor, email: string | null): Promise<MeResponse> {
    const userId = actor.userId!;
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    const rows = await db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId));
    return {
      userId,
      email,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      phone: profile?.phone ?? null,
      platformRole: actor.platformRole,
      memberships: rows,
    };
  }

  return {
    me,

    async updateProfile(actor, email, body, requestId) {
      const userId = actor.userId!;
      await db.transaction(async (tx) => {
        await tx
          .update(profiles)
          .set({
            ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
            ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
          })
          .where(eq(profiles.id, userId));
        await audit(tx, {
          actorId: userId,
          actorType: "customer",
          action: "profile.update",
          subjectType: "profile",
          subjectId: userId,
          metadata: { fields: Object.keys(body) },
          requestId,
        });
      });
      return me(actor, email);
    },

    /**
     * Suppression de compte (exigence Apple / Google) :
     * 1. refusee si l'utilisateur est proprietaire d'une organisation qui a d'autres membres
     *    (il doit d'abord transferer la propriete) ;
     * 2. une organisation dont il est le seul membre est supprimee avec lui ;
     * 3. le profil est anonymise et conserve (reservations passees) ;
     * 4. le compte Auth est supprime : plus aucune connexion possible.
     */
    async deleteAccount(actor, requestId) {
      const userId = actor.userId!;
      for (const [organizationId, role] of actor.memberships) {
        if (role !== "owner") continue;
        const others = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.organizationId, organizationId)));
        if (others.length > 1) {
          throw new DomainError(
            "conflict",
            "Vous etes proprietaire d'une organisation qui a d'autres membres : transferez la propriete avant de supprimer votre compte.",
            { organizationId },
          );
        }
      }

      await db.transaction(async (tx) => {
        for (const [organizationId, role] of actor.memberships) {
          if (role === "owner") {
            await tx.delete(organizations).where(eq(organizations.id, organizationId));
          } else {
            await tx
              .delete(organizationMembers)
              .where(
                and(
                  eq(organizationMembers.organizationId, organizationId),
                  eq(organizationMembers.userId, userId),
                ),
              );
          }
        }
        await tx.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
        await tx.delete(favorites).where(eq(favorites.userId, userId));
        await tx
          .update(profiles)
          .set({
            firstName: null,
            lastName: null,
            phone: null,
            avatarPath: null,
            deletedAt: new Date(),
          })
          .where(eq(profiles.id, userId));
        await audit(tx, {
          actorId: userId,
          actorType: "customer",
          action: "account.delete",
          subjectType: "profile",
          subjectId: userId,
          requestId,
        });
      });

      // Hors transaction : appel externe. En cas d'echec, le profil est deja anonymise
      // et l'utilisateur peut relancer (idempotent cote GoTrue).
      await supabaseAdmin.deleteUser(userId);
      await db.update(profiles).set({ authDeletedAt: new Date() }).where(eq(profiles.id, userId));
    },
  };
}
