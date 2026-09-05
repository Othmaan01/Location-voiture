"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { MapCanvas, type MapPoint } from "@/components/map/lazy-map";
import type { CityCoverage } from "@/types/database";

/**
 * Carte de couverture : une pastille par ville, dont le chiffre est le
 * nombre de vehicules disponibles. Un clic ouvre la page ville.
 */
export function CoverageMap({ cities, className }: { cities: CityCoverage[]; className?: string }) {
  const router = useRouter();

  const points = useMemo<MapPoint[]>(
    () =>
      cities
        .filter((city) => city.vehicle_count > 0)
        .map((city) => ({
          id: city.city_slug,
          latitude: city.latitude,
          longitude: city.longitude,
          label: String(city.vehicle_count),
        })),
    [cities],
  );

  return (
    <div className={className}>
      <MapCanvas
        points={points}
        onSelect={(slug) => router.push(`/location-voiture/${slug}`)}
        fitToPoints={points.length > 1}
      />
    </div>
  );
}
