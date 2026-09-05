"use client";

import Link from "next/link";
import { BadgeCheck, Fuel, MapPin, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/card";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { fuelLabel, transmissionLabel } from "@/lib/constants";
import { cn, formatDistance, formatPrice } from "@/lib/utils";
import type { VehicleSearchResult } from "@/types/database";

export function VehicleCard({
  vehicle,
  active = false,
  onHover,
  className,
}: {
  vehicle: VehicleSearchResult;
  active?: boolean;
  onHover?: (id: string | null) => void;
  className?: string;
}) {
  const title = `${vehicle.brand} ${vehicle.model}`;
  const distance = formatDistance(vehicle.distance_km);

  return (
    <article
      id={`vehicule-${vehicle.id}`}
      onMouseEnter={() => onHover?.(vehicle.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border bg-surface transition-all duration-200",
        active
          ? "border-ink-900 shadow-lift"
          : "border-ink-100 shadow-soft hover:-translate-y-0.5 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative">
        <VehicleImage
          src={vehicle.images?.[0]}
          alt={title}
          className="aspect-[4/3] w-full"
        />
        {vehicle.is_featured ? (
          <Badge variant="accent" className="absolute left-3 top-3 shadow-soft">
            <Star className="size-3 fill-current" /> Mis en avant
          </Badge>
        ) : null}
        <div className="absolute bottom-3 right-3 rounded-full bg-ink-900/92 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
          {formatPrice(vehicle.price_per_day)}
          <span className="text-xs font-normal text-ink-200"> / jour</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-tight text-ink-900">
            <Link href={`/vehicule/${vehicle.id}`} className="after:absolute after:inset-0">
              {title}
            </Link>
          </h3>
          {vehicle.version ? (
            <p className="text-xs text-muted-foreground">{vehicle.version}</p>
          ) : null}
        </div>

        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
          <li className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {vehicle.seats} places
          </li>
          <li className="inline-flex items-center gap-1">
            <Fuel className="size-3.5" /> {fuelLabel(vehicle.fuel)}
          </li>
          <li>{transmissionLabel(vehicle.transmission)}</li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-800">
              {vehicle.agency_name}
              {vehicle.agency_is_verified ? (
                <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label="Agence verifiee" />
              ) : null}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {vehicle.city_name ?? "France"}
              {distance ? ` · ${distance}` : ""}
            </p>
          </div>
          {vehicle.rating_count > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-700">
              <Star className="size-3.5 fill-amber-brand text-amber-brand" />
              {vehicle.rating_average.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
