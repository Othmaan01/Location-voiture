import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import type { MeResponse, UpdateProfileBody } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  bookings,
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
import { notFound } from "../../shared/errors.js";
import { PHOTOS_BUCKET, type StorageClient } from "../../shared/storage.js";
import { customerRatingsFor } from "../customer-reviews/service.js";

export interface IdentityService {
  createAvatarUpload(
    actor: Actor,
    mimeType: string,
  ): Promise<{ path: string; uploadUrl: string; token: string; expiresAt: string }>;
  confirmAvatar(
    actor: Actor,
    email: string | null,
    path: string,
    requestId: string,
  ): Promise<MeResponse>;
  me(actor: Actor, email: string | null): Promise<MeResponse>;
  updateProfile(
    actor: Actor,
    email: string | null,
    body: UpdateProfileBody,
    requestId: string,
  ): Promise<MeResponse>;
  deleteAccount(actor: Actor, requestId: string): Promise<void>;
}

export function createIdentityService(
  db: Database,
  supabaseAdmin: SupabaseAdmin,
  storage: StorageClient,
): IdentityService {
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
    const [[completed], ratings] = await Promise.all([
      db
        .select({ n: count() })
        .from(bookings)
        .where(and(eq(bookings.customerId, userId), eq(bookings.status, "completed"))),
      customerRatingsFor(db, [userId]),
    ]);
    return {
      userId,
      email,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      phone: profile?.phone ?? null,
      platformRole: actor.platformRole,
      preferredMode: profile?.preferredMode === "pro" ? "pro" : "client",
      memberships: rows,
      avatarUrl: profile?.avatarPath ? storage.publicUrl(PHOTOS_BUCKET, profile.avatarPath) : null,
      memberSince: (profile?.createdAt ?? new Date()).toISOString(),
      completedBookings: completed?.n ?? 0,
      ratingAverage: ratings.get(userId)?.average ?? null,
      ratingCount: ratings.get(userId)?.count ?? 0,
    };
  }

  const AVATAR_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return {
    me,

    async createAvatarUpload(actor, mimeType) {
      const path = `avatars/${actor.userId!}/${randomUUID()}.${AVATAR_EXT[mimeType] ?? "jpg"}`;
      const signed = await storage.createSignedUploadUrl(PHOTOS_BUCKET, path);
      return {
        path,
        uploadUrl: signed.uploadUrl,
        token: signed.token,
        expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
      };
    },

    async confirmAvatar(actor, email, path, requestId) {
      const userId = actor.userId!;
      if (!path.startsWith(`avatars/${userId}/`)) throw notFound("Fichier");
      if (!(await storage.exists(PHOTOS_BUCKET, path))) throw notFound("Fichier");
      const [previous] = await db
        .select({ avatarPath: profiles.avatarPath })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      await db.update(profiles).set({ avatarPath: path }).where(eq(profiles.id, userId));
      if (previous?.avatarPath && previous.avatarPath !== path)
        await storage.remove(PHOTOS_BUCKET, [previous.avatarPath]);
      await audit(db, {
        actorId: userId,
        actorType: "customer",
        action: "profile.avatar",
        subjectType: "profile",
        subjectId: userId,
        requestId,
      });
      return me(actor, email);
    },

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
