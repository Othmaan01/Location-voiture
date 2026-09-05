import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  CalendarRange,
  Car,
  Check,
  DoorOpen,
  Fuel,
  Gauge,
  Luggage,
  MapPin,
  Phone,
  Settings2,
  Star,
  Users,
} from "lucide-react";

import { LeadForm } from "@/components/forms/lead-form";
import { SpotMap } from "@/components/map/spot-map";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { ContactBar } from "@/components/vehicles/contact-bar";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { categoryLabel, fuelLabel, optionLabel, transmissionLabel } from "@/lib/constants";
import { getSimilarVehicles, getVehicleById } from "@/lib/queries";
import { breadcrumbSchema, jsonLd, vehicleSchema } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: "Vehicule introuvable" };

  const title = `${vehicle.brand} ${vehicle.model} en location${
    vehicle.agency.city_name ? ` a ${vehicle.agency.city_name}` : ""
  }`;

  return {
    title,
    description: `Louez cette ${vehicle.brand} ${vehicle.model} chez ${vehicle.agency.name} des ${Math.round(
      vehicle.price_per_day,
    )} € par jour. ${categoryLabel(vehicle.category)}, ${transmissionLabel(
      vehicle.transmission,
    )}, ${fuelLabel(vehicle.fuel)}.`,
    alternates: { canonical: `/vehicule/${vehicle.id}` },
    openGraph: { title, images: vehicle.images?.length ? [vehicle.images[0]] : undefined },
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const agency = vehicle.agency;
  const similar = await getSimilarVehicles(vehicle, null, 3);
  const title = `${vehicle.brand} ${vehicle.model}`;

  const specs = [
    { icon: Car, label: "Categorie", value: categoryLabel(vehicle.category) },
    { icon: Settings2, label: "Boite", value: transmissionLabel(vehicle.transmission) },
    { icon: Fuel, label: "Energie", value: fuelLabel(vehicle.fuel) },
    { icon: Users, label: "Places", value: `${vehicle.seats}` },
    { icon: DoorOpen, label: "Portes", value: `${vehicle.doors}` },
    { icon: Luggage, label: "Bagages", value: `${vehicle.luggage}` },
    ...(vehicle.year ? [{ icon: CalendarRange, label: "Annee", value: `${vehicle.year}` }] : []),
    ...(vehicle.mileage_included_day
      ? [{ icon: Gauge, label: "Km inclus / jour", value: `${vehicle.mileage_included_day} km` }]
      : []),
  ];

  const prices = [
    { label: "Journee", value: vehicle.price_per_day },
    { label: "Semaine", value: vehicle.price_per_week },
    { label: "Mois", value: vehicle.price_per_month },
  ].filter((p) => p.value);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(vehicleSchema(vehicle, agency))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: agency.name, url: `/agence/${agency.slug}` },
            { name: title, url: `/vehicule/${vehicle.id}` },
          ]),
        )}
      />

      <div className="container-page py-8 pb-28 lg:pb-8">
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-ink-900">Accueil</Link>
          <span>/</span>
          <Link href="/recherche" className="hover:text-ink-900">Recherche</Link>
          <span>/</span>
          <Link href={`/agence/${agency.slug}`} className="hover:text-ink-900">{agency.name}</Link>
          <span>/</span>
          <span className="text-ink-700">{title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* ---------------------------------------------------- Colonne gauche */}
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <VehicleImage
                src={vehicle.images?.[0]}
                alt={title}
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="aspect-[4/3] w-full rounded-card"
              />
              <div className="grid gap-3 sm:grid-rows-2">
                {[1, 2].map((index) => (
                  <VehicleImage
                    key={index}
                    src={vehicle.images?.[index]}
                    alt={`${title} - vue ${index + 1}`}
                    className="aspect-[4/3] w-full rounded-card sm:aspect-auto sm:h-full"
                  />
                ))}
              </div>
            </div>

            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{categoryLabel(vehicle.category)}</Badge>
                {vehicle.is_featured ? <Badge variant="accent">Mis en avant</Badge> : null}
                {agency.is_verified ? (
                  <Badge variant="success">
                    <BadgeCheck className="size-3" /> Agence verifiee
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{title}</h1>
              {vehicle.version ? <p className="text-ink-600">{vehicle.version}</p> : null}
            </header>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">Caracteristiques</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-ink-100 bg-surface p-3.5"
                  >
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <spec.icon className="size-3.5" /> {spec.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {vehicle.description ? (
              <section>
                <h2 className="mb-2 text-lg font-semibold text-ink-900">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {vehicle.description}
                </p>
              </section>
            ) : null}

            {vehicle.options.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-ink-900">Equipements inclus</h2>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {vehicle.options.map((option) => (
                    <li key={option} className="flex items-center gap-2 text-sm text-ink-700">
                      <Check className="size-4 text-success" /> {optionLabel(option)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">Conditions de location</h2>
              <ul className="space-y-2 text-sm text-ink-600">
                {vehicle.deposit_amount ? (
                  <li className="flex items-center gap-2">
                    <Banknote className="size-4 text-ink-400" /> Caution :{" "}
                    <strong className="font-medium text-ink-900">
                      {formatPrice(vehicle.deposit_amount)}
                    </strong>
                  </li>
                ) : null}
                {vehicle.extra_km_price ? (
                  <li className="flex items-center gap-2">
                    <Gauge className="size-4 text-ink-400" /> Kilometre supplementaire :{" "}
                    <strong className="font-medium text-ink-900">
                      {formatPrice(vehicle.extra_km_price, true)}
                    </strong>
                  </li>
                ) : null}
                {vehicle.min_driver_age ? (
                  <li className="flex items-center gap-2">
                    <Users className="size-4 text-ink-400" /> Age minimum du conducteur :{" "}
                    <strong className="font-medium text-ink-900">{vehicle.min_driver_age} ans</strong>
                  </li>
                ) : null}
                {vehicle.min_license_years ? (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-ink-400" /> Permis depuis au moins{" "}
                    <strong className="font-medium text-ink-900">{vehicle.min_license_years} ans</strong>
                  </li>
                ) : null}
              </ul>
              <p className="mt-4 rounded-xl bg-surface-muted p-3.5 text-xs text-muted-foreground">
                Le contrat de location est conclu directement entre vous et l&apos;agence.
                RentMap ne percoit aucune commission et n&apos;intervient pas dans la transaction.
              </p>
            </section>
          </div>

          {/* ---------------------------------------------------- Colonne droite */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card id="contact" className="scroll-mt-20">
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold text-ink-900">
                    {formatPrice(vehicle.price_per_day)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ jour</span>
                </div>

                {prices.length > 1 ? (
                  <dl className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                    {prices.map((price) => (
                      <div key={price.label} className="flex items-center justify-between px-3.5 py-2.5">
                        <dt className="text-sm text-muted-foreground">{price.label}</dt>
                        <dd className="text-sm font-medium text-ink-900">
                          {formatPrice(price.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="border-t border-ink-100 pt-4">
                  <LeadForm agencyId={agency.id} vehicleId={vehicle.id} agencyName={agency.name} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Propose par
                </p>
                <Link href={`/agence/${agency.slug}`} className="block">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900 hover:text-amber-brand-dark">
                    {agency.name}
                    {agency.is_verified ? <BadgeCheck className="size-4 text-success" /> : null}
                  </p>
                </Link>
                {agency.rating_count > 0 ? (
                  <p className="flex items-center gap-1 text-sm text-ink-700">
                    <Star className="size-4 fill-amber-brand text-amber-brand" />
                    {agency.rating_average.toFixed(1)}
                    <span className="text-muted-foreground">({agency.rating_count} avis)</span>
                  </p>
                ) : null}
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {agency.address_line}
                    {agency.address_line ? <br /> : null}
                    {agency.postal_code} {agency.city_name}
                  </span>
                </p>
                {agency.phone ? (
                  <a
                    href={`tel:${agency.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-ink-900 hover:text-amber-brand-dark"
                  >
                    <Phone className="size-4" /> {agency.phone}
                  </a>
                ) : null}

                {agency.latitude && agency.longitude ? (
                  <div className="h-44 overflow-hidden rounded-xl border border-ink-100">
                    <SpotMap
                      id={agency.id}
                      latitude={agency.latitude}
                      longitude={agency.longitude}
                      label={agency.name.slice(0, 2).toUpperCase()}
                      zoom={13}
                      interactive={false}
                    />
                  </div>
                ) : null}

                <ButtonLink href={`/agence/${agency.slug}`} variant="outline" className="w-full">
                  Voir tous ses vehicules
                </ButtonLink>
              </CardContent>
            </Card>
          </aside>
        </div>

        {similar.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-5 text-xl font-semibold text-ink-900">
              Vehicules similaires
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <VehicleCard key={item.id} vehicle={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <ContactBar price={vehicle.price_per_day} phone={agency.phone} />
    </>
  );
}
