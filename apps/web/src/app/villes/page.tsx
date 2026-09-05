import type { Metadata } from "next";
import Link from "next/link";

import { CoverageMap } from "@/components/map/coverage-map";
import { getCityCoverage } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Location de voiture par ville en France",
  description:
    "Toutes les villes couvertes par RentMap : trouvez les agences de location de voiture pres de chez vous, avec les prix et les vehicules disponibles.",
  alternates: { canonical: "/villes" },
};

export default async function CitiesPage() {
  const coverage = await getCityCoverage(400);
  const covered = coverage.filter((city) => city.vehicle_count > 0);
  const upcoming = coverage.filter((city) => city.vehicle_count === 0);

  const byLetter = covered.reduce<Record<string, typeof covered>>((acc, city) => {
    const letter = city.city_name[0].toUpperCase();
    (acc[letter] ??= []).push(city);
    return acc;
  }, {});

  return (
    <div className="container-page py-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">
          Location de voiture, ville par ville
        </h1>
        <p className="text-ink-600">
          {covered.length} ville{covered.length > 1 ? "s" : ""} couverte
          {covered.length > 1 ? "s" : ""} et {coverage.length} au referentiel. Cliquez sur une
          pastille de la carte ou choisissez votre ville dans la liste.
        </p>
      </header>

      <div className="mt-8 h-[28rem] overflow-hidden rounded-card border border-ink-100 shadow-soft sm:h-[34rem]">
        <CoverageMap cities={coverage} className="h-full w-full" />
      </div>

      <section className="mt-12 space-y-8">
        {Object.keys(byLetter)
          .sort()
          .map((letter) => (
            <div key={letter}>
              <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold text-ink-400">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-muted text-ink-700">
                  {letter}
                </span>
                <span className="h-px flex-1 bg-ink-100" />
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {byLetter[letter].map((city) => (
                  <Link
                    key={city.city_id}
                    href={`/location-voiture/${city.city_slug}`}
                    className="group rounded-card border border-ink-100 bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <p className="font-medium text-ink-900 group-hover:text-amber-brand-dark">
                      {city.city_name}
                      {city.department_code ? (
                        <span className="ml-1.5 text-xs font-normal text-ink-400">
                          {city.department_code}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {city.agency_count} agence{city.agency_count > 1 ? "s" : ""} ·{" "}
                      {city.vehicle_count} vehicule{city.vehicle_count > 1 ? "s" : ""}
                    </p>
                    {city.min_price ? (
                      <p className="mt-2 text-sm font-semibold text-ink-800">
                        Des {formatPrice(city.min_price)} / jour
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-14 border-t border-ink-100 pt-8">
          <h2 className="text-lg font-semibold text-ink-900">Villes bientot couvertes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces villes sont deja au referentiel : la premiere agence qui s&apos;inscrit y sera seule
            visible.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {upcoming.map((city) => (
              <Link
                key={city.city_id}
                href={`/location-voiture/${city.city_slug}`}
                className="rounded-full bg-surface-muted px-3 py-1.5 text-sm text-ink-600 transition-colors hover:bg-ink-900 hover:text-white"
              >
                {city.city_name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
