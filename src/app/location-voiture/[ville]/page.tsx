import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";

import { CoverageMap } from "@/components/map/coverage-map";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { VEHICLE_CATEGORIES } from "@/lib/constants";
import { getCityBySlug, getCityCoverage, listCities, searchVehicles } from "@/lib/queries";
import { parseSearchParams } from "@/lib/search-params";
import { breadcrumbSchema, cityDescription, cityTitle, jsonLd } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export const revalidate = 3600;

/** Pre-genere les pages des villes couvertes : c'est le socle du SEO local. */
export async function generateStaticParams() {
  const cities = await listCities(200);
  return cities.map((city) => ({ ville: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ville: string }>;
}): Promise<Metadata> {
  const { ville } = await params;
  const city = await getCityBySlug(ville);
  if (!city) return { title: "Ville introuvable" };

  const coverage = (await getCityCoverage(400)).find((c) => c.city_slug === ville);

  return {
    title: cityTitle(city),
    description: cityDescription(city, coverage?.agency_count ?? 0, coverage?.min_price),
    alternates: { canonical: `/location-voiture/${city.slug}` },
    openGraph: { title: cityTitle(city), type: "website" },
  };
}

export default async function CityPage({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const city = await getCityBySlug(ville);
  if (!city) notFound();

  const filters = parseSearchParams({ ville, taille: "12" });
  const [results, coverageAll] = await Promise.all([
    searchVehicles({ ...filters, lat: city.latitude, lng: city.longitude, radiusKm: 30 }),
    getCityCoverage(400),
  ]);

  const coverage = coverageAll.find((c) => c.city_slug === ville);
  const agencies = Array.from(
    new Map(
      results.items.map((item) => [
        item.agency_id,
        { id: item.agency_id, name: item.agency_name, slug: item.agency_slug },
      ]),
    ).values(),
  );

  const nearby = coverageAll
    .filter((c) => c.city_slug !== ville && c.vehicle_count > 0)
    .map((c) => ({
      ...c,
      d: Math.hypot(c.latitude - city.latitude, (c.longitude - city.longitude) * 0.7),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Villes", url: "/villes" },
            { name: city.name, url: `/location-voiture/${city.slug}` },
          ]),
        )}
      />

      <div className="hero-glow border-b border-ink-100">
        <div className="container-page py-12">
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-ink-900">Accueil</Link>
            <span>/</span>
            <Link href="/villes" className="hover:text-ink-900">Villes</Link>
            <span>/</span>
            <span className="text-ink-700">{city.name}</span>
          </nav>

          <h1 className="max-w-3xl text-3xl font-semibold text-ink-900 sm:text-4xl">
            Location de voiture a {city.name} : tous les loueurs sur une carte
          </h1>

          <p className="mt-4 max-w-2xl text-ink-600">
            {coverage && coverage.agency_count > 0 ? (
              <>
                {coverage.agency_count} agence{coverage.agency_count > 1 ? "s" : ""} de location
                référencée{coverage.agency_count > 1 ? "s" : ""} a {city.name}
                {city.department_name ? ` (${city.department_name})` : ""}, soit{" "}
                {coverage.vehicle_count} vehicule{coverage.vehicle_count > 1 ? "s" : ""} disponible
                {coverage.vehicle_count > 1 ? "s" : ""}
                {coverage.min_price ? ` a partir de ${formatPrice(coverage.min_price)} par jour` : ""}.
                Comparez les offres et contactez directement le loueur : aucune commission n&apos;est
                prelevee sur votre location.
              </>
            ) : (
              <>
                Aucune agence n&apos;est encore referencee a {city.name}. Vous etes loueur dans cette
                ville ? Referencez votre agence gratuitement et soyez le premier visible ici.
              </>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/recherche?ville=${city.slug}&lat=${city.latitude}&lng=${city.longitude}`}>
              Voir tous les vehicules
            </ButtonLink>
            <ButtonLink href="/inscription?profil=pro" variant="outline">
              Je suis loueur a {city.name}
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        {results.items.length > 0 ? (
          <>
            <section className="mb-12 grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div>
                <h2 className="mb-4 text-xl font-semibold text-ink-900">
                  Les vehicules disponibles a {city.name}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.items.map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>

                {results.total > results.items.length ? (
                  <div className="mt-6">
                    <ButtonLink
                      href={`/recherche?ville=${city.slug}&lat=${city.latitude}&lng=${city.longitude}`}
                      variant="outline"
                    >
                      Voir les {results.total} vehicules <ArrowRight />
                    </ButtonLink>
                  </div>
                ) : null}
              </div>

              <div className="h-80 overflow-hidden rounded-card border border-ink-100 shadow-soft lg:sticky lg:top-24 lg:h-[36rem]">
                <CoverageMap
                  cities={coverageAll.filter((c) => c.city_slug === ville)}
                  className="h-full w-full"
                />
              </div>
            </section>

            {agencies.length > 0 ? (
              <section className="mb-12">
                <h2 className="mb-4 text-xl font-semibold text-ink-900">
                  Les agences de location a {city.name}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {agencies.map((agency) => (
                    <Link
                      key={agency.id}
                      href={`/agence/${agency.slug}`}
                      className="rounded-card border border-ink-100 bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <p className="font-medium text-ink-900">{agency.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {city.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mb-12">
              <h2 className="mb-4 text-xl font-semibold text-ink-900">
                Par type de vehicule a {city.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_CATEGORIES.map((category) => (
                  <Link
                    key={category.value}
                    href={`/recherche?ville=${city.slug}&categories=${category.value}`}
                    className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-900 hover:text-ink-900"
                  >
                    {category.label} a {city.name}
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState
            className="mb-12"
            title={`Pas encore de vehicule a ${city.name}`}
            description="Nous elargissons la couverture ville par ville. En attendant, explorez les villes voisines."
            action={<ButtonLink href="/villes" variant="outline" size="sm">Voir toutes les villes</ButtonLink>}
          />
        )}

        {/* -------------------------------------------------------------- FAQ */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-ink-900">
            Questions frequentes sur la location a {city.name}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                q: `Combien coute une location de voiture a ${city.name} ?`,
                a: coverage?.min_price
                  ? `Les tarifs commencent a ${formatPrice(coverage.min_price)} par jour pour une citadine. Le prix varie selon la categorie, la duree et la saison.`
                  : "Le prix depend de la categorie du vehicule, de la duree et de la saison. Comparez les offres des agences referencees pour trouver le meilleur tarif.",
              },
              {
                q: "RentMap prend-il une commission sur ma location ?",
                a: "Non. Vous contactez et reservez directement aupres de l'agence. Notre modele repose uniquement sur l'abonnement des professionnels referencés.",
              },
              {
                q: "Quels documents faut-il pour louer ?",
                a: "En general : permis de conduire valide, piece d'identite, moyen de paiement au nom du conducteur et parfois un justificatif de domicile. Chaque agence precise ses conditions.",
              },
              {
                q: `Peut-on louer un utilitaire a ${city.name} ?`,
                a: `Oui, filtrez par categorie "Utilitaire" pour ne voir que les fourgons et camionnettes disponibles a ${city.name}.`,
              },
            ].map((item) => (
              <Card key={item.q}>
                <CardContent className="space-y-1.5">
                  <p className="font-medium text-ink-900">{item.q}</p>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {nearby.length > 0 ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-ink-900">Villes a proximite</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((item) => (
                <Link
                  key={item.city_id}
                  href={`/location-voiture/${item.city_slug}`}
                  className="rounded-full bg-surface-muted px-3.5 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-900 hover:text-white"
                >
                  {item.city_name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
