import Link from "next/link";
import type { SearchResult } from "@lv/contracts";

import { VehicleCard } from "@/components/loueurs/vehicle-card";
import { EmptyState } from "@/components/ui/card";

/** Grille de resultats : chaque carte pointe vers le loueur (le detail se fait dans l'application). */
export function SearchResults({ items }: { items: SearchResult[] }) {
  if (items.length === 0)
    return (
      <EmptyState
        title="Aucun véhicule ne correspond"
        description="Élargissez la zone ou retirez un filtre. De nouveaux loueurs sont publiés chaque semaine."
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <div key={v.id} className="space-y-2">
          <VehicleCard vehicle={v} appHref="/pro#application" />
          <Link
            href={`/loueurs/${v.loueurId}`}
            className="block px-1 text-xs font-semibold text-muted-foreground hover:text-ink-900"
          >
            {v.loueurName}
            {v.cityName ? ` · ${v.cityName}` : ""}
            {v.distanceKm !== null ? ` · ${v.distanceKm.toLocaleString("fr-FR")} km` : ""}
          </Link>
        </div>
      ))}
    </div>
  );
}
