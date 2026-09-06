import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppCta } from "@/components/layout/app-cta";
import { SearchResults } from "@/components/loueurs/search-results";
import { api } from "@/lib/api";
import { breadcrumbSchema, jsonLd } from "@/lib/seo";
import { formatCents } from "@/lib/utils";

export const revalidate = 600;

type Params = { params: Promise<{ ville: string }> };

async function load(slug: string) {
  const cities = await api.cities();
  const city = cities?.cities.find((c) => c.slug === slug) ?? null;
  if (!city) return null;
  const params = new URLSearchParams({ citySlug: slug, limit: "48" });
  const results = await api.search(params);
  return { city, results };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ville } = await params;
  const data = await load(ville);
  if (!data) return { title: "Ville introuvable" };
  const min =
    data.results?.items.reduce<number | null>(
      (m, v) => (v.dailyCents !== null && (m === null || v.dailyCents < m) ? v.dailyCents : m),
      null,
    ) ?? null;
  return {
    title: `Location de voiture à ${data.city.name} : loueurs professionnels vérifiés`,
    description: `${data.results?.total ?? 0} véhicule(s) à louer à ${data.city.name}${min !== null ? ` à partir de ${formatCents(min)} par jour` : ""}. Loueurs vérifiés, prix du loueur, contact direct sans commission.`,
  };
}

export default async function CityPage({ params }: Params) {
  const { ville } = await params;
  const data = await load(ville);
  if (!data) notFound();
  const items = data.results?.items ?? [];
  return (
    <div className="container-page py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Villes", url: "/villes" },
            { name: data.city.name, url: `/location-voiture/${data.city.slug}` },
          ]),
        )}
      />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
        Location de voiture
      </p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink-900">{data.city.name}</h1>
      <p className="mt-2 text-muted-foreground">
        {items.length} véhicule{items.length > 1 ? "s" : ""} chez des loueurs professionnels
        vérifiés, autour de {data.city.name}.
      </p>
      <div className="mt-8">
        <SearchResults items={items} />
      </div>
      <div className="mt-12">
        <AppCta />
      </div>
    </div>
  );
}
