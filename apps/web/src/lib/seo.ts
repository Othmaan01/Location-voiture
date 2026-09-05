import { publicEnv } from "@/lib/env";
import type { Agency, City, Vehicle } from "@/types/database";

export function absoluteUrl(path: string) {
  return `${publicEnv.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Balise JSON-LD prete a etre injectee dans un <script type="application/ld+json">. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data) };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: publicEnv.siteName,
    url: publicEnv.siteUrl,
    description:
      "Annuaire cartographie des loueurs de voitures : comparez les agences et contactez-les directement.",
  };
}

export function agencySchema(agency: Agency) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: agency.name,
    url: absoluteUrl(`/agence/${agency.slug}`),
    description: agency.description ?? undefined,
    image: agency.logo_url ?? undefined,
    telephone: agency.phone ?? undefined,
    email: agency.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: agency.address_line ?? undefined,
      postalCode: agency.postal_code ?? undefined,
      addressLocality: agency.city_name ?? undefined,
      addressCountry: "FR",
    },
    geo:
      agency.latitude && agency.longitude
        ? { "@type": "GeoCoordinates", latitude: agency.latitude, longitude: agency.longitude }
        : undefined,
    aggregateRating:
      agency.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: agency.rating_average,
            reviewCount: agency.rating_count,
          }
        : undefined,
  };
}

export function vehicleSchema(vehicle: Vehicle, agency: Agency) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`,
    description: vehicle.description ?? undefined,
    image: vehicle.images?.length ? vehicle.images : undefined,
    brand: { "@type": "Brand", name: vehicle.brand },
    offers: {
      "@type": "Offer",
      price: vehicle.price_per_day,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/vehicule/${vehicle.id}`),
      seller: { "@type": "AutoRental", name: agency.name },
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function cityTitle(city: Pick<City, "name">) {
  return `Location de voiture a ${city.name} : tous les loueurs`;
}

export function cityDescription(
  city: Pick<City, "name">,
  agencyCount: number,
  minPrice?: number | null,
) {
  const price = minPrice ? ` a partir de ${Math.round(minPrice)} € par jour` : "";
  return `Comparez ${agencyCount} agence${agencyCount > 1 ? "s" : ""} de location de voiture a ${city.name}${price}. Carte interactive, prix, options et contact direct avec le loueur.`;
}
