import type { LoueurProfile } from "@lv/contracts";

import { publicEnv } from "@/lib/env";

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
      "Plateforme de mise en relation avec des loueurs de voitures professionnels vérifiés. Sans commission sur la location.",
  };
}

export function loueurSchema(l: LoueurProfile) {
  const agency = l.agencies[0];
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: l.name,
    url: absoluteUrl(`/loueurs/${l.id}`),
    description: l.bio ?? undefined,
    image: l.logoUrl ?? undefined,
    telephone: agency?.phone ?? undefined,
    address: agency
      ? {
          "@type": "PostalAddress",
          streetAddress: agency.addressLine ?? undefined,
          postalCode: agency.postalCode ?? undefined,
          addressLocality: agency.cityName ?? undefined,
          addressCountry: "FR",
        }
      : undefined,
    geo:
      agency && agency.latitude !== null && agency.longitude !== null
        ? { "@type": "GeoCoordinates", latitude: agency.latitude, longitude: agency.longitude }
        : undefined,
    aggregateRating:
      l.ratingCount > 0
        ? { "@type": "AggregateRating", ratingValue: l.ratingAverage, reviewCount: l.ratingCount }
        : undefined,
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
