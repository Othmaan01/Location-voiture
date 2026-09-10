import { and, eq, inArray, sql } from "drizzle-orm";
import { quote, type RatePlan as PricingRatePlan } from "@lv/pricing";
import type {
  FeedQuery,
  LoueurProfile,
  LoueurSummary,
  PublicVehicleCard,
  PublicVehicleDetail,
  SearchQuery,
  SearchResult,
  VehicleAvailability,
} from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  agencies,
  availabilityBlocks,
  bookings,
  cities,
  favorites,
  organizations,
  ratePlans,
  vehiclePhotos,
  vehicles,
} from "../../db/schema.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { notFound } from "../../shared/errors.js";
import type { StorageClient } from "../../shared/storage.js";
import {
  discountedDaily,
  liveOffersByOrganization,
  liveOffersFor,
  publicOffer,
} from "../offers/service.js";
import { ratingsFor } from "../reviews/service.js";
import { PHOTOS_BUCKET } from "../vehicles/service.js";

const UTILITY_CATEGORIES = ["utilitaire", "minibus"] as const;
const PREMIUM_CATEGORIES = ["prestige", "cabriolet", "coupe"] as const;
const NEW_DAYS = 30;

type VehicleRow = typeof vehicles.$inferSelect;

/**
 * Catalogue public : ce que voit un client (connecte ou non).
 * Regle absolue : uniquement des organisations verifiees, des agences publiees,
 * des vehicules publies et non suspendus. Jamais de plaque, jamais de document.
 */
export interface PublicCatalogService {
  availability(vehicleId: string, from: string, to: string): Promise<VehicleAvailability>;
  vehicle(
    vehicleId: string,
    period: { from: string; to: string } | null,
  ): Promise<PublicVehicleDetail>;
  feed(query: FeedQuery): Promise<{ items: LoueurSummary[]; nextCursor: string | null }>;
  loueur(
    organizationId: string,
    period: { from: string; to: string } | null,
  ): Promise<LoueurProfile>;
  search(query: SearchQuery): Promise<{ items: SearchResult[]; total: number }>;
  cities(): Promise<
    {
      slug: string;
      name: string;
      departmentCode: string | null;
      latitude: number;
      longitude: number;
    }[]
  >;
  listFavorites(actor: Actor): Promise<SearchResult[]>;
  addFavorite(actor: Actor, vehicleId: string): Promise<void>;
  removeFavorite(actor: Actor, vehicleId: string): Promise<void>;
}

export function createPublicCatalogService(
  db: Database,
  storage: StorageClient,
): PublicCatalogService {
  const publicUrl = (path: string | null | undefined) =>
    path ? storage.publicUrl(PHOTOS_BUCKET, path) : null;

  /** Premiere photo et plan actif de chaque vehicule, en deux requetes groupees. */
  async function decorate(rows: VehicleRow[]) {
    if (rows.length === 0)
      return {
        photos: new Map<string, string>(),
        plans: new Map<string, typeof ratePlans.$inferSelect>(),
        offers: new Map<string, ReturnType<typeof publicOffer>>(),
      };
    const ids = rows.map((r) => r.id);
    const [photoRows, planRows, offerRows] = await Promise.all([
      db
        .select({ vehicleId: vehiclePhotos.vehicleId, path: vehiclePhotos.storagePath })
        .from(vehiclePhotos)
        .where(and(inArray(vehiclePhotos.vehicleId, ids), eq(vehiclePhotos.position, 0))),
      db
        .select()
        .from(ratePlans)
        .where(and(inArray(ratePlans.vehicleId, ids), eq(ratePlans.isActive, true))),
      liveOffersFor(db, rows),
    ]);
    return {
      photos: new Map(photoRows.map((p) => [p.vehicleId, p.path])),
      plans: new Map(planRows.map((p) => [p.vehicleId, p])),
      offers: new Map([...offerRows].map(([vehicleId, o]) => [vehicleId, publicOffer(o)])),
    };
  }

  function toPricingPlan(p: typeof ratePlans.$inferSelect): PricingRatePlan {
    return {
      currency: p.currency as PricingRatePlan["currency"],
      dailyCents: p.dailyCents,
      weekendDailyCents: p.weekendDailyCents,
      weeklyCents: p.weeklyCents,
      monthlyCents: p.monthlyCents,
      depositCents: p.depositCents,
      kmIncludedPerDay: p.kmIncludedPerDay,
      extraKmCents: p.extraKmCents,
      minDays: p.minDays,
      maxDays: p.maxDays,
    };
  }

  const publishedVehicleFilter = (orgFilter = true) =>
    and(
      eq(vehicles.status, "published"),
      sql`${vehicles.suspendedAt} is null`,
      orgFilter
        ? sql`exists (select 1 from ${organizations} o where o.id = ${vehicles.organizationId} and o.status = 'verified')`
        : sql`true`,
      sql`exists (select 1 from ${agencies} a where a.id = ${vehicles.agencyId} and a.status <> 'suspended' and a.location is not null)`,
    );

  return {
    async feed(query) {
      const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;
      const origin =
        query.lat !== undefined && query.lng !== undefined
          ? sql`extensions.st_setsrid(extensions.st_makepoint(${query.lng}, ${query.lat}), 4326)::extensions.geography`
          : null;
      const categoryFilter =
        query.tab === "utility"
          ? sql`and v.category in ('utilitaire', 'minibus')`
          : query.tab === "premium"
            ? sql`and v.category in ('prestige', 'cabriolet', 'coupe')`
            : sql``;
      const newFilter =
        query.tab === "new"
          ? sql`and o.created_at > now() - interval '${sql.raw(String(NEW_DAYS))} days'`
          : query.tab === "offers"
            ? sql`and exists (select 1 from public.offers of where of.organization_id = o.id and of.status = 'active' and now() between of.starts_at and of.ends_at)`
            : sql``;

      // Une ligne par organisation verifiee ayant au moins un vehicule publie (dans l'onglet demande).
      const rows = await db.execute<{
        id: string;
        name: string;
        slug: string;
        logo_path: string | null;
        accent: string;
        rating_avg: number | null;
        rating_count: number;
        created_at: string;
        city_name: string | null;
        distance_km: number | null;
        vehicle_count: number;
        from_daily_cents: number | null;
      }>(sql`
        with orgs as (
          select o.id, o.name, o.slug, o.logo_path, o.accent, o.created_at,
            (select round(avg(r.rating)::numeric, 1)::float from public.reviews r where r.organization_id = o.id and r.status = 'published') as rating_avg,
            (select count(*)::int from public.reviews r where r.organization_id = o.id and r.status = 'published') as rating_count,
            (select a.city_name from ${agencies} a where a.organization_id = o.id and a.status <> 'suspended' and a.location is not null order by a.created_at limit 1) as city_name,
            ${origin ? sql`(select min(extensions.st_distance(a.location, ${origin})) / 1000.0 from ${agencies} a where a.organization_id = o.id and a.status <> 'suspended' and a.location is not null and a.location is not null)` : sql`null::double precision`} as distance_km,
            (select count(*) from ${vehicles} v join ${agencies} a on a.id = v.agency_id
              where v.organization_id = o.id and v.status = 'published' and v.suspended_at is null and a.status <> 'suspended' and a.location is not null ${categoryFilter}) as vehicle_count,
            (select min(rp.daily_cents) from ${ratePlans} rp join ${vehicles} v on v.id = rp.vehicle_id
              where v.organization_id = o.id and v.status = 'published' and v.suspended_at is null and rp.is_active ${categoryFilter}) as from_daily_cents
          from ${organizations} o
          where o.status = 'verified' ${newFilter}
        )
        select * from orgs
        where vehicle_count > 0
          ${origin && query.tab === "nearby" ? sql`and distance_km is not null and distance_km <= ${query.radiusKm}` : sql``}
        order by ${origin ? sql`distance_km asc nulls last,` : sql``} ${query.tab === "new" ? sql`created_at desc,` : sql``} vehicle_count desc, name asc
        limit ${query.limit + 1} offset ${offset}
      `);
      const page = rows.slice(0, query.limit);
      const orgIds = page.map((r) => r.id);
      const thumbRows =
        orgIds.length > 0
          ? await db
              .select()
              .from(vehicles)
              .where(and(inArray(vehicles.organizationId, orgIds), publishedVehicleFilter(false)))
              .orderBy(vehicles.createdAt)
          : [];
      const { photos, plans } = await decorate(thumbRows);
      const orgOffers = await liveOffersByOrganization(db, orgIds);
      const items: LoueurSummary[] = page.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        logoUrl: publicUrl(r.logo_path),
        accent: r.accent as LoueurSummary["accent"],
        cityName: r.city_name,
        distanceKm: r.distance_km === null ? null : Math.round(Number(r.distance_km) * 10) / 10,
        vehicleCount: Number(r.vehicle_count),
        fromDailyCents: r.from_daily_cents === null ? null : Number(r.from_daily_cents),
        currency: "EUR",
        verified: true,
        ratingAverage: r.rating_avg === null ? null : Number(r.rating_avg),
        ratingCount: Number(r.rating_count ?? 0),
        offer: orgOffers.has(r.id) ? publicOffer(orgOffers.get(r.id)!) : null,
        thumbnails: thumbRows
          .filter((v) => v.organizationId === r.id)
          .slice(0, 3)
          .map((v) => ({
            id: v.id,
            brand: v.brand,
            model: v.model,
            category: v.category,
            photoUrl: publicUrl(photos.get(v.id)),
            dailyCents: plans.get(v.id)?.dailyCents ?? null,
          })),
        createdAt: new Date(r.created_at).toISOString(),
      }));
      return { items, nextCursor: rows.length > query.limit ? String(offset + query.limit) : null };
    },

    async loueur(organizationId, period) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, organizationId), eq(organizations.status, "verified")))
        .limit(1);
      if (!org) throw notFound("Loueur");
      const agencyRows = await db
        .select()
        .from(agencies)
        .where(
          and(
            eq(agencies.organizationId, organizationId),
            sql`${agencies.status} <> 'suspended' and ${agencies.latitude} is not null`,
          ),
        );
      const vehicleRows = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.organizationId, organizationId), publishedVehicleFilter(false)))
        .orderBy(vehicles.createdAt);
      const { photos, plans, offers: vehicleOffers } = await decorate(vehicleRows);
      const rating = (await ratingsFor(db, [organizationId])).get(organizationId) ?? {
        average: null,
        count: 0,
      };
      let availability = new Map<string, boolean>();
      if (period && vehicleRows.length > 0) {
        const rows = await db.execute<{ id: string; available: boolean }>(sql`
          select v.id, public.vehicle_is_available(v.id, tstzrange(${period.from}::timestamptz, ${period.to}::timestamptz, '[)')) as available
          from ${vehicles} v where v.id in ${sql.raw(`(${vehicleRows.map((v) => `'${v.id}'`).join(",")})`)}`);
        availability = new Map(rows.map((r) => [r.id, r.available]));
      }
      const cards: PublicVehicleCard[] = vehicleRows.map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        version: v.version,
        category: v.category,
        transmission: v.transmission,
        fuel: v.fuel,
        seats: v.seats,
        photoUrl: publicUrl(photos.get(v.id)),
        dailyCents: plans.get(v.id)?.dailyCents ?? null,
        discountedDailyCents:
          vehicleOffers.has(v.id) && plans.get(v.id)
            ? discountedDaily(plans.get(v.id)!.dailyCents, vehicleOffers.get(v.id)!)
            : null,
        offer: vehicleOffers.get(v.id) ?? null,
        depositCents: plans.get(v.id)?.depositCents ?? null,
        currency: "EUR",
        agencyId: v.agencyId,
        available: period ? (availability.get(v.id) ?? null) : null,
      }));
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: publicUrl(org.logoPath),
        bannerUrl: publicUrl(org.bannerPath),
        bio: org.bio,
        website: org.website,
        accent: org.accent as LoueurProfile["accent"],
        verified: true,
        ratingAverage: rating.average,
        ratingCount: rating.count,
        vehicleCount: cards.length,
        responseRate: null,
        responseTimeHours: null,
        agencies: agencyRows.map((a) => ({
          id: a.id,
          name: a.name,
          addressLine: a.addressLine,
          postalCode: a.postalCode,
          cityName: a.cityName,
          description: a.description,
          photoUrl: publicUrl(a.photoPath),
          latitude: a.latitude,
          longitude: a.longitude,
          phone: a.phone,
          openingHours: (a.openingHours ?? {}) as Record<string, [string, string][]>,
        })),
        vehicles: cards,
        memberSince: org.createdAt.toISOString(),
      };
    },

    async vehicle(vehicleId, period) {
      const [v] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), publishedVehicleFilter(true)))
        .limit(1);
      if (!v) throw notFound("Vehicule");
      const [[org], [agency], photoRows, { plans, offers: vehicleOffers }, ratings, count] =
        await Promise.all([
          db.select().from(organizations).where(eq(organizations.id, v.organizationId)).limit(1),
          db.select().from(agencies).where(eq(agencies.id, v.agencyId)).limit(1),
          db
            .select({ path: vehiclePhotos.storagePath })
            .from(vehiclePhotos)
            .where(eq(vehiclePhotos.vehicleId, v.id))
            .orderBy(vehiclePhotos.position),
          decorate([v]),
          ratingsFor(db, [v.organizationId]),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(vehicles)
            .where(
              and(eq(vehicles.organizationId, v.organizationId), publishedVehicleFilter(false)),
            ),
        ]);
      if (!org || !agency) throw notFound("Vehicule");
      let available: boolean | null = null;
      if (period) {
        const [row] = await db.execute<{ ok: boolean }>(
          sql`select public.vehicle_is_available(${v.id}::uuid, tstzrange(${period.from}::timestamptz, ${period.to}::timestamptz, '[)')) as ok`,
        );
        available = row?.ok ?? null;
      }
      const plan = plans.get(v.id) ?? null;
      const offer = vehicleOffers.get(v.id) ?? null;
      const rating = ratings.get(v.organizationId) ?? { average: null, count: 0 };
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        version: v.version,
        category: v.category,
        transmission: v.transmission,
        fuel: v.fuel,
        seats: v.seats,
        dailyCents: plan?.dailyCents ?? null,
        discountedDailyCents: offer && plan ? discountedDaily(plan.dailyCents, offer) : null,
        offer,
        depositCents: plan?.depositCents ?? null,
        currency: "EUR",
        agencyId: v.agencyId,
        available,
        photos: photoRows.map((p) => storage.publicUrl(PHOTOS_BUCKET, p.path)),
        year: v.year,
        doors: v.doors,
        luggage: v.luggage,
        color: v.color,
        description: v.description,
        options: v.options ?? [],
        minDriverAge: v.minDriverAge,
        minLicenseYears: v.minLicenseYears,
        ratePlan: plan
          ? {
              weekendDailyCents: plan.weekendDailyCents,
              weeklyCents: plan.weeklyCents,
              monthlyCents: plan.monthlyCents,
              kmIncludedPerDay: plan.kmIncludedPerDay,
              extraKmCents: plan.extraKmCents,
              minDays: plan.minDays,
              maxDays: plan.maxDays,
            }
          : null,
        agency: {
          id: agency.id,
          name: agency.name,
          addressLine: agency.addressLine,
          postalCode: agency.postalCode,
          cityName: agency.cityName,
          latitude: agency.latitude,
          longitude: agency.longitude,
          phone: agency.phone,
          timezone: agency.timezone,
        },
        loueur: {
          id: org.id,
          name: org.name,
          logoUrl: publicUrl(org.logoPath),
          accent: org.accent as PublicVehicleDetail["loueur"]["accent"],
          verified: org.status === "verified",
          ratingAverage: rating.average,
          ratingCount: rating.count,
          vehicleCount: count[0]?.n ?? 0,
        },
      };
    },

    async availability(vehicleId, from, to) {
      const [v] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), publishedVehicleFilter(true)))
        .limit(1);
      if (!v) throw notFound("Vehicule");
      const rows = await db.execute<{ from: string; to: string; kind: "booking" | "block" }>(sql`
        select lower(period) as "from", upper(period) as "to", 'booking'::text as kind
          from ${bookings} where vehicle_id = ${vehicleId}::uuid and status in ('confirmed', 'active')
          and period && tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)')
        union all
        select lower(period), upper(period), 'block'::text
          from ${availabilityBlocks} where vehicle_id = ${vehicleId}::uuid
          and period && tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)')
        order by 1`);
      return {
        vehicleId,
        from,
        to,
        unavailable: rows.map((r) => ({
          from: new Date(r.from).toISOString(),
          to: new Date(r.to).toISOString(),
          kind: r.kind,
        })),
      };
    },

    async search(query) {
      let origin: { lat: number; lng: number } | null =
        query.lat !== undefined && query.lng !== undefined
          ? { lat: query.lat, lng: query.lng }
          : null;
      if (!origin && query.citySlug) {
        const [city] = await db
          .select({ latitude: cities.latitude, longitude: cities.longitude })
          .from(cities)
          .where(eq(cities.slug, query.citySlug))
          .limit(1);
        if (city) origin = { lat: city.latitude, lng: city.longitude };
      }
      const originSql = origin
        ? sql`extensions.st_setsrid(extensions.st_makepoint(${origin.lng}, ${origin.lat}), 4326)::extensions.geography`
        : null;
      const period =
        query.from && query.to
          ? sql`tstzrange(${query.from}::timestamptz, ${query.to}::timestamptz, '[)')`
          : null;
      const q = query.q ? `%${query.q.toLowerCase()}%` : null;
      const orderBy =
        query.sort === "price_asc"
          ? sql`rp.daily_cents asc`
          : query.sort === "price_desc"
            ? sql`rp.daily_cents desc`
            : query.sort === "distance" && originSql
              ? sql`distance_km asc nulls last`
              : originSql
                ? sql`distance_km asc nulls last, rp.daily_cents asc`
                : sql`v.created_at desc`;

      const rows = await db.execute<{
        id: string;
        brand: string;
        model: string;
        version: string | null;
        category: VehicleRow["category"];
        transmission: VehicleRow["transmission"];
        fuel: VehicleRow["fuel"];
        seats: number;
        agency_id: string;
        organization_id: string;
        loueur_name: string;
        city_name: string | null;
        latitude: number | null;
        longitude: number | null;
        distance_km: number | null;
        daily_cents: number;
        deposit_cents: number;
        photo_path: string | null;
        total_count: number;
      }>(sql`
        select v.id, v.brand, v.model, v.version, v.category, v.transmission, v.fuel, v.seats, v.agency_id, v.organization_id,
          o.name as loueur_name, a.city_name, a.latitude, a.longitude,
          ${originSql ? sql`extensions.st_distance(a.location, ${originSql}) / 1000.0` : sql`null::double precision`} as distance_km,
          rp.daily_cents, rp.deposit_cents,
          (select p.storage_path from ${vehiclePhotos} p where p.vehicle_id = v.id and p.position = 0) as photo_path,
          count(*) over () as total_count
        from ${vehicles} v
        join ${organizations} o on o.id = v.organization_id and o.status = 'verified'
        join ${agencies} a on a.id = v.agency_id and a.status <> 'suspended' and a.location is not null
        join ${ratePlans} rp on rp.vehicle_id = v.id and rp.is_active
        where v.status = 'published' and v.suspended_at is null
          ${originSql ? sql`and a.location is not null and extensions.st_dwithin(a.location, ${originSql}, ${query.radiusKm * 1000})` : sql``}
          ${period ? sql`and public.vehicle_is_available(v.id, ${period})` : sql``}
          ${q ? sql`and lower(v.brand || ' ' || v.model || ' ' || coalesce(v.version, '') || ' ' || o.name) like ${q}` : sql``}
          ${query.categories && query.categories.length > 0 ? sql`and v.category in ${query.categories}` : sql``}
          ${query.transmission ? sql`and v.transmission = ${query.transmission}` : sql``}
          ${query.fuel ? sql`and v.fuel = ${query.fuel}` : sql``}
          ${query.minSeats ? sql`and v.seats >= ${query.minSeats}` : sql``}
          ${query.maxDailyCents ? sql`and rp.daily_cents <= ${query.maxDailyCents}` : sql``}
        order by ${orderBy}
        limit ${query.limit} offset ${query.offset}
      `);

      const planRows =
        rows.length > 0
          ? await db
              .select()
              .from(ratePlans)
              .where(
                and(
                  inArray(
                    ratePlans.vehicleId,
                    rows.map((r) => r.id),
                  ),
                  eq(ratePlans.isActive, true),
                ),
              )
          : [];
      const searchOffers = await liveOffersFor(
        db,
        rows.map((r) => ({ id: r.id, organizationId: r.organization_id })),
      );
      const planByVehicle = new Map(planRows.map((p) => [p.vehicleId, p]));
      const items: SearchResult[] = rows.map((r) => {
        let totalCents: number | null = null;
        let days: number | null = null;
        const plan = planByVehicle.get(r.id);
        if (query.from && query.to && plan) {
          try {
            const qte = quote({
              ratePlan: toPricingPlan(plan),
              period: { start: query.from, end: query.to },
              agencyTimeZone: "Europe/Paris",
            });
            totalCents = qte.total.cents;
            days = qte.days;
          } catch {
            totalCents = null;
          }
        }
        return {
          id: r.id,
          brand: r.brand,
          model: r.model,
          version: r.version,
          category: r.category,
          transmission: r.transmission,
          fuel: r.fuel,
          seats: Number(r.seats),
          photoUrl: publicUrl(r.photo_path),
          dailyCents: Number(r.daily_cents),
          discountedDailyCents: searchOffers.has(r.id)
            ? discountedDaily(Number(r.daily_cents), publicOffer(searchOffers.get(r.id)!))
            : null,
          offer: searchOffers.has(r.id) ? publicOffer(searchOffers.get(r.id)!) : null,
          depositCents: Number(r.deposit_cents),
          currency: "EUR",
          agencyId: r.agency_id,
          available: query.from && query.to ? true : null,
          loueurId: r.organization_id,
          loueurName: r.loueur_name,
          loueurVerified: true,
          cityName: r.city_name,
          latitude: r.latitude === null ? null : Number(r.latitude),
          longitude: r.longitude === null ? null : Number(r.longitude),
          distanceKm: r.distance_km === null ? null : Math.round(Number(r.distance_km) * 10) / 10,
          totalCents,
          days,
        };
      });
      return { items, total: rows.length > 0 ? Number(rows[0]!.total_count) : 0 };
    },

    async cities() {
      const rows = await db
        .select({
          slug: cities.slug,
          name: cities.name,
          departmentCode: cities.departmentCode,
          latitude: cities.latitude,
          longitude: cities.longitude,
        })
        .from(cities)
        .orderBy(cities.name);
      return rows;
    },

    async listFavorites(actor) {
      assertCan(actor, "booking.read_own");
      const favRows = await db
        .select({ vehicleId: favorites.vehicleId })
        .from(favorites)
        .where(eq(favorites.userId, actor.userId!))
        .orderBy(favorites.createdAt);
      if (favRows.length === 0) return [];
      const ids = favRows.map((f) => f.vehicleId);
      const rows = await db
        .select({ v: vehicles, orgName: organizations.name, agency: agencies })
        .from(vehicles)
        .innerJoin(
          organizations,
          and(eq(organizations.id, vehicles.organizationId), eq(organizations.status, "verified")),
        )
        .innerJoin(
          agencies,
          and(
            eq(agencies.id, vehicles.agencyId),
            sql`${agencies.status} <> 'suspended' and ${agencies.latitude} is not null`,
          ),
        )
        .where(
          and(
            inArray(vehicles.id, ids),
            eq(vehicles.status, "published"),
            sql`${vehicles.suspendedAt} is null`,
          ),
        );
      const { photos, plans, offers: favOffers } = await decorate(rows.map((r) => r.v));
      const byId = new Map(rows.map((r) => [r.v.id, r]));
      return ids
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)
        .map(({ v, orgName, agency }): SearchResult => ({
          id: v.id,
          brand: v.brand,
          model: v.model,
          version: v.version,
          category: v.category,
          transmission: v.transmission,
          fuel: v.fuel,
          seats: v.seats,
          photoUrl: publicUrl(photos.get(v.id)),
          dailyCents: plans.get(v.id)?.dailyCents ?? null,
          discountedDailyCents:
            favOffers.has(v.id) && plans.get(v.id)
              ? discountedDaily(plans.get(v.id)!.dailyCents, favOffers.get(v.id)!)
              : null,
          offer: favOffers.get(v.id) ?? null,
          depositCents: plans.get(v.id)?.depositCents ?? null,
          currency: "EUR",
          agencyId: v.agencyId,
          available: null,
          loueurId: v.organizationId,
          loueurName: orgName,
          loueurVerified: true,
          cityName: agency.cityName,
          latitude: agency.latitude,
          longitude: agency.longitude,
          distanceKm: null,
          totalCents: null,
          days: null,
        }));
    },

    async addFavorite(actor, vehicleId) {
      assertCan(actor, "booking.read_own");
      const [row] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), publishedVehicleFilter()))
        .limit(1);
      if (!row) throw notFound("Vehicule");
      await db.insert(favorites).values({ userId: actor.userId!, vehicleId }).onConflictDoNothing();
    },

    async removeFavorite(actor, vehicleId) {
      assertCan(actor, "booking.read_own");
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, actor.userId!), eq(favorites.vehicleId, vehicleId)));
    },
  };
}

export const FEED_FILTERS = { UTILITY_CATEGORIES, PREMIUM_CATEGORIES, NEW_DAYS };
