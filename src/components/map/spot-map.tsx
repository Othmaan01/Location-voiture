"use client";

import { MapCanvas } from "@/components/map/lazy-map";

/**
 * Carte a un seul point (adresse d'une agence).
 *
 * Composant client dedie : les fiches agence et vehicule sont des Server
 * Components, qui ne peuvent pas charger MapLibre a la demande eux-memes.
 */
export function SpotMap({
  id,
  latitude,
  longitude,
  label,
  zoom = 14,
  interactive = true,
}: {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
  interactive?: boolean;
}) {
  return (
    <MapCanvas
      points={[{ id, latitude, longitude, label }]}
      center={[longitude, latitude]}
      zoom={zoom}
      interactive={interactive}
    />
  );
}
