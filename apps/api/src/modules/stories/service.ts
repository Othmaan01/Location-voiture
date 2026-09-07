import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, gte, inArray, isNull, lte } from "drizzle-orm";
import type { StoryGroup, StoryItem } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { offers, organizations, stories, vehiclePhotos, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { PHOTOS_BUCKET, STORIES_BUCKET, type StorageClient } from "../../shared/storage.js";
import { publicOffer } from "../offers/service.js";

const NEW_VEHICLE_DAYS = 7;
const MAX_GROUPS = 20;
const MAX_ITEMS_PER_GROUP = 6;
const STORY_TTL_MS = 48 * 60 * 60 * 1000;
const UPLOAD_TTL_SECONDS = 600;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
const VIDEO_EXT = new Set(["mp4", "mov"]);

type StoryDto = {
  id: string;
  mediaType: "photo" | "video";
  mediaUrl: string;
  durationSeconds: number | null;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
};

export interface StoriesService {
  /** Bulles du feed : loueurs verifies avec du neuf, contenu genere + stories manuelles. */
  feed(): Promise<StoryGroup[]>;
  listForOrganization(actor: Actor, organizationId: string): Promise<StoryDto[]>;
  createUpload(
    actor: Actor,
    organizationId: string,
    mimeType: string,
  ): Promise<{ path: string; uploadUrl: string; token: string; expiresAt: string }>;
  confirm(
    actor: Actor,
    organizationId: string,
    path: string,
    caption: string | undefined,
    durationSeconds: number | undefined,
    requestId: string,
  ): Promise<StoryDto>;
  remove(actor: Actor, storyId: string, requestId: string): Promise<void>;
}

export function createStoriesService(db: Database, storage: StorageClient): StoriesService {
  const publicUrl = (path: string | null | undefined) =>
    path ? storage.publicUrl(PHOTOS_BUCKET, path) : null;

  function storyDto(row: typeof stories.$inferSelect): StoryDto {
    return {
      id: row.id,
      mediaType: row.mediaType,
      mediaUrl: storage.publicUrl(STORIES_BUCKET, row.mediaPath),
      durationSeconds: row.durationSeconds,
      caption: row.caption,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  return {
    async feed() {
      const now = new Date();
      const since = new Date(now.getTime() - NEW_VEHICLE_DAYS * 86_400_000);
      const orgRows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          logoPath: organizations.logoPath,
          bannerPath: organizations.bannerPath,
          accent: organizations.accent,
        })
        .from(organizations)
        .where(eq(organizations.status, "verified"));
      if (orgRows.length === 0) return [];
      const orgIds = orgRows.map((o) => o.id);
      const [offerRows, newVehicleRows, storyRows] = await Promise.all([
        db
          .select()
          .from(offers)
          .where(
            and(
              inArray(offers.organizationId, orgIds),
              eq(offers.status, "active"),
              lte(offers.startsAt, now),
              gt(offers.endsAt, now),
            ),
          )
          .orderBy(desc(offers.createdAt)),
        db
          .select()
          .from(vehicles)
          .where(
            and(
              inArray(vehicles.organizationId, orgIds),
              eq(vehicles.status, "published"),
              isNull(vehicles.suspendedAt),
              gte(vehicles.createdAt, since),
            ),
          )
          .orderBy(desc(vehicles.createdAt)),
        db
          .select()
          .from(stories)
          .where(and(inArray(stories.organizationId, orgIds), gt(stories.expiresAt, now)))
          .orderBy(desc(stories.createdAt)),
      ]);
      // Photos : premiere photo des vehicules concernes (nouveaux + cibles d'offres).
      const vehicleIds = [
        ...new Set([
          ...newVehicleRows.map((v) => v.id),
          ...offerRows.map((o) => o.vehicleId).filter((v): v is string => !!v),
        ]),
      ];
      const photoRows =
        vehicleIds.length > 0
          ? await db
              .select({ vehicleId: vehiclePhotos.vehicleId, path: vehiclePhotos.storagePath })
              .from(vehiclePhotos)
              .where(
                and(inArray(vehiclePhotos.vehicleId, vehicleIds), eq(vehiclePhotos.position, 0)),
              )
          : [];
      const photoMap = new Map(photoRows.map((p) => [p.vehicleId, p.path]));
      const offerVehicleIds = offerRows.map((o) => o.vehicleId).filter((v): v is string => !!v);
      const offerVehicles =
        offerVehicleIds.length > 0
          ? await db
              .select({ id: vehicles.id, brand: vehicles.brand, model: vehicles.model })
              .from(vehicles)
              .where(inArray(vehicles.id, offerVehicleIds))
          : [];
      const labelMap = new Map(offerVehicles.map((v) => [v.id, `${v.brand} ${v.model}`]));

      const groups: StoryGroup[] = [];
      for (const org of orgRows) {
        const items: StoryItem[] = [];
        for (const s of storyRows.filter((r) => r.organizationId === org.id)) {
          items.push({
            id: `story:${s.id}`,
            kind: "story",
            imageUrl:
              s.mediaType === "photo" ? storage.publicUrl(STORIES_BUCKET, s.mediaPath) : null,
            videoUrl:
              s.mediaType === "video" ? storage.publicUrl(STORIES_BUCKET, s.mediaPath) : null,
            durationSeconds: s.durationSeconds,
            title: s.caption ?? org.name,
            subtitle: null,
            vehicleId: null,
            offer: null,
            createdAt: s.createdAt.toISOString(),
          });
        }
        for (const o of offerRows.filter((r) => r.organizationId === org.id)) {
          const label = o.vehicleId ? labelMap.get(o.vehicleId) : null;
          items.push({
            id: `offer:${o.id}`,
            kind: "offer",
            imageUrl: publicUrl(o.vehicleId ? photoMap.get(o.vehicleId) : org.bannerPath),
            videoUrl: null,
            durationSeconds: null,
            title: o.title,
            subtitle: label ? `Sur ${label}` : "Sur toute la flotte",
            vehicleId: o.vehicleId,
            offer: publicOffer(o),
            createdAt: o.createdAt.toISOString(),
          });
        }
        for (const v of newVehicleRows.filter((r) => r.organizationId === org.id)) {
          items.push({
            id: `vehicle:${v.id}`,
            kind: "new_vehicle",
            imageUrl: publicUrl(photoMap.get(v.id)),
            videoUrl: null,
            durationSeconds: null,
            title: `${v.brand} ${v.model}`,
            subtitle: "Nouveau dans la flotte",
            vehicleId: v.id,
            offer: null,
            createdAt: v.createdAt.toISOString(),
          });
        }
        if (items.length === 0) continue;
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const kept = items.slice(0, MAX_ITEMS_PER_GROUP);
        groups.push({
          organizationId: org.id,
          name: org.name,
          logoUrl: publicUrl(org.logoPath),
          accent: org.accent as StoryGroup["accent"],
          highlight: kept.some((i) => i.kind === "offer")
            ? "offer"
            : kept.some((i) => i.kind === "story")
              ? "story"
              : "new_vehicle",
          items: kept,
          latestAt: kept[0]!.createdAt,
        });
      }
      groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
      return groups.slice(0, MAX_GROUPS);
    },

    async listForOrganization(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const rows = await db
        .select()
        .from(stories)
        .where(and(eq(stories.organizationId, organizationId), gt(stories.expiresAt, new Date())))
        .orderBy(desc(stories.createdAt));
      return rows.map(storyDto);
    },

    async createUpload(actor, organizationId, mimeType) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "vehicle.write", { organizationId });
      const ext = EXT[mimeType];
      if (!ext) throw new DomainError("validation_failed", "Format non pris en charge.");
      const path = `${organizationId}/story-${randomUUID()}.${ext}`;
      const signed = await storage.createSignedUploadUrl(STORIES_BUCKET, path);
      return {
        path,
        uploadUrl: signed.uploadUrl,
        token: signed.token,
        expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
      };
    },

    async confirm(actor, organizationId, path, caption, durationSeconds, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "vehicle.write", { organizationId });
      if (!path.startsWith(`${organizationId}/story-`)) throw notFound("Fichier");
      if (!(await storage.exists(STORIES_BUCKET, path))) throw notFound("Fichier");
      const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
      const mediaType = VIDEO_EXT.has(ext) ? "video" : "photo";
      const [org] = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (org?.status !== "verified")
        throw new DomainError(
          "conflict",
          "Les stories sont reservees aux organisations verifiees.",
        );
      const [row] = await db
        .insert(stories)
        .values({
          organizationId,
          mediaPath: path,
          mediaType,
          durationSeconds: mediaType === "video" ? (durationSeconds ?? null) : null,
          caption: caption?.trim() || null,
          createdBy: actor.userId,
          expiresAt: new Date(Date.now() + STORY_TTL_MS),
        })
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "story.create",
        subjectType: "story",
        subjectId: row!.id,
        organizationId,
        requestId,
      });
      return storyDto(row!);
    },

    async remove(actor, storyId, requestId) {
      const [row] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
      if (!row) throw notFound("Story");
      assertCanOrHide(actor, "organization.read", { organizationId: row.organizationId }, "Story");
      assertCan(actor, "vehicle.write", { organizationId: row.organizationId });
      await db.delete(stories).where(eq(stories.id, storyId));
      await storage.remove(STORIES_BUCKET, [row.mediaPath]);
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "story.delete",
        subjectType: "story",
        subjectId: storyId,
        organizationId: row.organizationId,
        requestId,
      });
    },
  };
}
