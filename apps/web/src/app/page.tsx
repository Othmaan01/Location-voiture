import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Car,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { CoverageMap } from "@/components/map/coverage-map";
import { HeroSearch } from "@/components/search/hero-search";
import type { CityOption } from "@/components/search/search-shell";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { VEHICLE_CATEGORIES } from "@/lib/constants";
import { getCityCoverage, getFeaturedVehicles, getPlatformStats, listCities } from "@/lib/queries";
import { PLANS } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";

// Le catalogue evolue souvent : on regenere la page au maximum toutes les 10 min.
export const revalidate = 600;

export default async function HomePage() {
  const [cities, coverage, featured, stats] = await Promise.all([
    listCities(300),
    getCityCoverage(120),
    getFeaturedVehicles(6),
    getPlatformStats(),
  ]);

  const cityOptions: CityOption[] = cities.map((city) => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    latitude: city.latitude,
    longitude: city.longitude,
    department_code: city.department_code,
  }));

  const topCities = coverage.filter((c) => c.vehicle_count > 0).slice(0, 12);

  return (
    <>
      {/* ---------------------------------------------------------- HERO */}
      <section className="hero-glow border-b border-ink-100">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="space-y-7">
            <Badge variant="accent">
              <MapPin className="size-3" /> {stats.cities || 46} villes cartographiees
            </Badge>

            <h1 className="text-4xl font-semibold leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl">
              Tous les loueurs de voitures,
              <br />
              <span className="text-amber-brand-dark">sur une seule carte.</span>
            </h1>

            <p className="max-w-xl text-lg text-ink-600">
              Comparez les agences pres de chez vous, consultez les vehicules disponibles avec leurs
              prix et leurs options, puis contactez le loueur en direct. Aucune commission, aucun
              intermediaire.
            </p>

            <HeroSearch cities={cityOptions} />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-4" /> {stats.agencies} agences referencees
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Car className="size-4" /> {stats.vehicles} vehicules en ligne
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" /> Contact direct, sans commission
              </span>
            </div>
          </div>

          <div className="h-72 overflow-hidden rounded-card border border-ink-100 shadow-lift sm:h-[26rem] lg:h-[32rem]">
            <CoverageMap cities={coverage} className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ CATEGORIES */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">Par type de vehicule</h2>
            <p className="text-sm text-muted-foreground">
              Du citadin au utilitaire, trouvez la categorie qui correspond a votre besoin.
            </p>
          </div>
          <Link
            href="/recherche"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-ink-700 hover:text-ink-900 sm:inline-flex"
          >
            Voir tout <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VEHICLE_CATEGORIES.slice(0, 6).map((category) => (
            <Link
              key={category.value}
              href={`/recherche?categories=${category.value}`}
              className="group flex flex-col items-start gap-3 rounded-card border border-ink-100 bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="rounded-full bg-surface-muted p-2.5 text-ink-700 transition-colors group-hover:bg-amber-brand-soft">
                <Car className="size-5" />
              </span>
              <span className="text-sm font-medium text-ink-900">{category.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- SELECTION */}
      {featured.length > 0 ? (
        <section className="container-page py-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink-900">La selection du moment</h2>
              <p className="text-sm text-muted-foreground">
                Vehicules mis en avant par nos agences partenaires.
              </p>
            </div>
            <ButtonLink href="/recherche" variant="outline" size="sm" className="shrink-0">
              Tout explorer
            </ButtonLink>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------- COMMENT CA MARCHE */}
      <section className="container-page py-16">
        <div className="rounded-card border border-ink-100 bg-surface p-8 shadow-soft sm:p-12">
          <h2 className="text-2xl font-semibold text-ink-900">Comment ca marche</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trois etapes, aucun frais de dossier.
          </p>

          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Cherchez sur la carte",
                text: "Filtrez par ville, budget, categorie, boite et energie. Les resultats se mettent a jour en direct.",
              },
              {
                icon: MessageSquare,
                title: "Contactez le loueur",
                text: "Envoyez votre demande a l'agence : dates souhaitees, questions, options. Elle vous repond directement.",
              },
              {
                icon: CalendarCheck,
                title: "Reservez en direct",
                text: "Le contrat se fait entre vous et l'agence. RentMap ne prend aucune commission sur la location.",
              },
            ].map((step, index) => (
              <li key={step.title} className="relative space-y-3">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-ink-900 text-white">
                  <step.icon className="size-5" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-brand-dark">
                  Etape {index + 1}
                </p>
                <p className="font-semibold text-ink-900">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ VILLES */}
      {topCities.length > 0 ? (
        <section className="container-page py-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink-900">Location de voiture par ville</h2>
              <p className="text-sm text-muted-foreground">
                Les agences les plus consultees, ville par ville.
              </p>
            </div>
            <ButtonLink href="/villes" variant="outline" size="sm" className="shrink-0">
              Toutes les villes
            </ButtonLink>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topCities.map((city) => (
              <Link
                key={city.city_id}
                href={`/location-voiture/${city.city_slug}`}
                className="group rounded-card border border-ink-100 bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <p className="font-medium text-ink-900 group-hover:text-amber-brand-dark">
                  {city.city_name}
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
        </section>
      ) : null}

      {/* --------------------------------------------------------- ESPACE PRO */}
      <section className="container-page py-16">
        <Card className="overflow-hidden border-ink-900 bg-ink-900 text-white">
          <CardContent className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-5">
              <Badge variant="accent">Espace professionnel</Badge>
              <h2 className="text-3xl font-semibold leading-tight">
                Votre agence merite d&apos;etre trouvee.
              </h2>
              <p className="text-ink-200">
                Referencez votre flotte, apparaissez sur la carte de votre ville et recevez les
                demandes de location directement. Vous payez un abonnement clair, jamais un
                pourcentage sur vos locations.
              </p>

              <ul className="space-y-2.5 text-sm text-ink-100">
                {[
                  "Fiche agence geolocalisee et optimisee pour Google",
                  "Vos vehicules avec prix, options et disponibilites",
                  "Demandes de contact envoyees directement par e-mail",
                  "Sans engagement, resiliable a tout moment",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-amber-brand" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 pt-2">
                <ButtonLink href="/inscription?profil=pro" variant="accent">
                  Referencer mon agence
                </ButtonLink>
                <ButtonLink
                  href="/tarifs"
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10"
                >
                  Voir les tarifs
                </ButtonLink>
              </div>
            </div>

            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-ink-300">
                      {plan.vehicleLimit === null
                        ? "Vehicules illimites"
                        : `${plan.vehicleLimit} vehicule${plan.vehicleLimit > 1 ? "s" : ""} en ligne`}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="text-xl font-semibold">
                      {plan.monthlyPrice === 0 ? "Gratuit" : `${plan.monthlyPrice} €`}
                    </span>
                    {plan.monthlyPrice > 0 ? (
                      <span className="block text-xs text-ink-300">/ mois</span>
                    ) : null}
                  </p>
                </div>
              ))}
              <p className="flex items-center gap-2 pt-1 text-xs text-ink-300">
                <TrendingUp className="size-3.5" /> Changez de palier a tout moment.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
