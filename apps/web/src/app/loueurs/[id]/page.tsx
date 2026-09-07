import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Phone, ShieldCheck, Star } from "lucide-react";

import { AppCta } from "@/components/layout/app-cta";
import { Avatar } from "@/components/loueurs/loueur-card";
import { VehicleCard } from "@/components/loueurs/vehicle-card";
import { Badge } from "@/components/ui/card";
import { api } from "@/lib/api";
import { breadcrumbSchema, jsonLd, loueurSchema } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const l = await api.loueur(id);
  if (!l) return { title: "Loueur introuvable" };
  const city = l.agencies[0]?.cityName;
  return {
    title: `${l.name}${city ? ` — location de voiture à ${city}` : ""}`,
    description:
      l.bio ??
      `${l.name} : ${l.vehicleCount} véhicule${l.vehicleCount > 1 ? "s" : ""} à louer${city ? ` à ${city}` : ""}. Loueur professionnel vérifié, contact direct, sans commission.`,
    openGraph: { images: l.bannerUrl ? [l.bannerUrl] : l.logoUrl ? [l.logoUrl] : [] },
  };
}

/** Profil public du loueur : en-tete, grille des vehicules, avis, agences (ADR-0009). */
export default async function LoueurPage({ params }: Params) {
  const { id } = await params;
  const [l, reviews] = await Promise.all([api.loueur(id), api.reviews(id)]);
  if (!l) notFound();
  const main = l.agencies[0];
  const appHref = "/application";
  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(loueurSchema(l))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            ...(main?.cityName
              ? [{ name: main.cityName, url: `/recherche?q=${encodeURIComponent(main.cityName)}` }]
              : []),
            { name: l.name, url: `/loueurs/${l.id}` },
          ]),
        )}
      />
      {l.bannerUrl ? (
        <div className="relative mb-6 h-44 overflow-hidden rounded-card md:h-60">
          <Image src={l.bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      ) : null}
      <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={l.name} uri={l.logoUrl} size={72} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold text-ink-900">{l.name}</h1>
              {l.verified ? (
                <Badge variant="accent">
                  <ShieldCheck className="size-3" /> Vérifié
                </Badge>
              ) : null}
            </div>
            {main ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />{" "}
                {[main.addressLine, main.postalCode, main.cityName].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center md:text-left">
          <Stat
            value={String(l.vehicleCount)}
            label={l.vehicleCount > 1 ? "véhicules" : "véhicule"}
          />
          <Stat
            value={l.ratingAverage !== null ? l.ratingAverage.toLocaleString("fr-FR") : "—"}
            label={l.ratingCount > 0 ? `${l.ratingCount} avis` : "pas encore d'avis"}
          />
          <Stat value={new Date(l.memberSince).getFullYear().toString()} label="membre depuis" />
        </dl>
      </header>
      {l.bio ? <p className="mt-6 max-w-3xl text-ink-600">{l.bio}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={appHref}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Contacter dans l&apos;application
        </a>
        {main?.phone ? (
          <a
            href={`tel:${main.phone.replace(/\s/g, "")}`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink-200 bg-surface px-5 text-sm font-semibold text-ink-900 hover:bg-surface-muted"
          >
            <Phone className="size-4" /> Appeler
          </a>
        ) : null}
        {l.website ? (
          <a
            href={l.website}
            rel="nofollow noopener"
            target="_blank"
            className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-brand-tint"
          >
            Site web
          </a>
        ) : null}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink-900">Véhicules</h2>
        {l.vehicles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun véhicule publié pour le moment.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {l.vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} appHref={appHref} />
            ))}
          </div>
        )}
      </section>

      {reviews && reviews.reviews.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink-900">
            Avis clients{" "}
            <span className="text-base font-semibold text-muted-foreground">
              ({reviews.ratingCount})
            </span>
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.reviews.map((r) => (
              <li key={r.id} className="rounded-card border border-ink-200 bg-surface p-5">
                <div className="flex items-center gap-1 text-ink-900">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-4 ${n <= r.rating ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.customerName} · {formatDate(r.createdAt)}
                  </span>
                </div>
                {r.comment ? <p className="mt-2 text-sm text-ink-700">{r.comment}</p> : null}
                {r.reply ? (
                  <p className="mt-3 border-l-2 border-ink-300 pl-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-ink-900">Réponse de {l.name} : </span>
                    {r.reply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {l.agencies.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink-900">Agences</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {l.agencies.map((a) => (
              <li
                key={a.id}
                className="overflow-hidden rounded-card border border-ink-200 bg-surface"
              >
                {a.photoUrl ? (
                  <div className="relative h-36">
                    <Image
                      src={a.photoUrl}
                      alt={a.name}
                      fill
                      sizes="50vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <p className="font-semibold text-ink-900">{a.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[a.addressLine, [a.postalCode, a.cityName].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {a.description ? (
                    <p className="mt-2 text-sm text-ink-700">{a.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12">
        <AppCta title={`Réservez chez ${l.name} dans l'application`} />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold text-ink-900">{value}</dd>
    </div>
  );
}
