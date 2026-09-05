import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Globe, Mail, MapPin, Phone, Star } from "lucide-react";

import { LeadForm } from "@/components/forms/lead-form";
import { SpotMap } from "@/components/map/spot-map";
import { ContactBar } from "@/components/vehicles/contact-bar";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import {
  WEEKDAYS,
  categoryLabel,
  fuelLabel,
  serviceLabel,
  transmissionLabel,
} from "@/lib/constants";
import { getAgencyBySlug } from "@/lib/queries";
import { agencySchema, breadcrumbSchema, jsonLd } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) return { title: "Agence introuvable" };

  const title = `${agency.name}${agency.city_name ? ` - Location de voiture a ${agency.city_name}` : ""}`;
  return {
    title,
    description:
      agency.description ??
      `Decouvrez les ${agency.vehicles.length} vehicules proposes par ${agency.name} et contactez l'agence directement.`,
    alternates: { canonical: `/agence/${agency.slug}` },
  };
}

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) notFound();

  const minPrice = agency.vehicles.length
    ? Math.min(...agency.vehicles.map((v) => v.price_per_day))
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(agencySchema(agency))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: agency.name, url: `/agence/${agency.slug}` },
          ]),
        )}
      />

      {/* Bandeau */}
      <div className="hero-glow border-b border-ink-100">
        <div className="container-page py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {agency.is_verified ? (
                  <Badge variant="success">
                    <BadgeCheck className="size-3" /> Agence verifiee
                  </Badge>
                ) : null}
                {agency.plan === "pro" ? <Badge variant="accent">Partenaire Pro</Badge> : null}
              </div>

              <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{agency.name}</h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {[agency.address_line, agency.postal_code, agency.city_name]
                    .filter(Boolean)
                    .join(", ")}
                </span>
                {agency.rating_count > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-amber-brand text-amber-brand" />
                    <strong className="font-medium text-ink-900">
                      {agency.rating_average.toFixed(1)}
                    </strong>
                    ({agency.rating_count} avis)
                  </span>
                ) : null}
                <span>
                  {agency.vehicles.length} vehicule{agency.vehicles.length > 1 ? "s" : ""} en ligne
                </span>
              </div>
            </div>

            {minPrice ? (
              <div className="rounded-card border border-ink-100 bg-surface px-5 py-4 shadow-soft">
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="text-2xl font-semibold text-ink-900">{formatPrice(minPrice)}</p>
                <p className="text-xs text-muted-foreground">par jour</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 pb-28 lg:grid-cols-[1.6fr_1fr] lg:pb-10">
        <div className="space-y-10">
          {agency.description ? (
            <section>
              <h2 className="mb-2 text-lg font-semibold text-ink-900">A propos de l&apos;agence</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {agency.description}
              </p>
            </section>
          ) : null}

          {agency.services.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">Services proposes</h2>
              <div className="flex flex-wrap gap-2">
                {agency.services.map((service) => (
                  <Badge key={service} variant="outline">
                    {serviceLabel(service)}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink-900">
              Vehicules disponibles ({agency.vehicles.length})
            </h2>

            {agency.vehicles.length === 0 ? (
              <EmptyState
                title="Aucun vehicule publie pour le moment"
                description="Cette agence n'a pas encore mis de vehicule en ligne. Vous pouvez la contacter directement."
              />
            ) : (
              <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
                {agency.vehicles.map((vehicle) => (
                  <Link
                    key={vehicle.id}
                    href={`/vehicule/${vehicle.id}`}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-surface-muted"
                  >
                    <VehicleImage
                      src={vehicle.images?.[0]}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-36"
                      sizes="150px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900 group-hover:text-amber-brand-dark">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {categoryLabel(vehicle.category)} ·{" "}
                        {transmissionLabel(vehicle.transmission)} · {fuelLabel(vehicle.fuel)} ·{" "}
                        {vehicle.seats} places
                      </p>
                      {vehicle.is_featured ? (
                        <Badge variant="accent" className="mt-2">
                          Mis en avant
                        </Badge>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-ink-900">
                        {formatPrice(vehicle.price_per_day)}
                      </p>
                      <p className="text-xs text-muted-foreground">par jour</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {agency.reviews.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-ink-900">Avis clients</h2>
              <div className="space-y-3">
                {agency.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={
                              index < review.rating
                                ? "size-4 fill-amber-brand text-amber-brand"
                                : "size-4 text-ink-200"
                            }
                          />
                        ))}
                      </div>
                      {review.comment ? (
                        <p className="text-sm text-ink-700">{review.comment}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card id="contact" className="scroll-mt-20">
            <CardContent className="space-y-3">
              <p className="font-semibold text-ink-900">Contacter l&apos;agence</p>
              <LeadForm agencyId={agency.id} agencyName={agency.name} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 text-sm">
              {agency.phone ? (
                <a
                  href={`tel:${agency.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 font-medium text-ink-900 hover:text-amber-brand-dark"
                >
                  <Phone className="size-4" /> {agency.phone}
                </a>
              ) : null}
              {agency.email ? (
                <a
                  href={`mailto:${agency.email}`}
                  className="flex items-center gap-2 text-ink-700 hover:text-ink-900"
                >
                  <Mail className="size-4" /> {agency.email}
                </a>
              ) : null}
              {agency.website ? (
                <a
                  href={agency.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2 text-ink-700 hover:text-ink-900"
                >
                  <Globe className="size-4" /> Site internet
                </a>
              ) : null}

              {Object.keys(agency.opening_hours ?? {}).length > 0 ? (
                <div className="border-t border-ink-100 pt-3">
                  <p className="mb-2 flex items-center gap-2 font-medium text-ink-900">
                    <Clock className="size-4" /> Horaires
                  </p>
                  <dl className="space-y-1 text-xs">
                    {WEEKDAYS.map((day) => {
                      const slots = agency.opening_hours?.[day.key] ?? [];
                      return (
                        <div key={day.key} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{day.label}</dt>
                          <dd className="text-ink-800">
                            {slots.length === 0
                              ? "Ferme"
                              : slots.map((slot) => `${slot[0]} - ${slot[1]}`).join(", ")}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {agency.latitude && agency.longitude ? (
            <div className="h-64 overflow-hidden rounded-card border border-ink-100 shadow-soft">
              <SpotMap
                id={agency.id}
                latitude={agency.latitude}
                longitude={agency.longitude}
                label={agency.name.slice(0, 2).toUpperCase()}
                zoom={14}
              />
            </div>
          ) : null}
        </aside>
      </div>

      <ContactBar price={minPrice} phone={agency.phone} label="Contacter" />
    </>
  );
}
