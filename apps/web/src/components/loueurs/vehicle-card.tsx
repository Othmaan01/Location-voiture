import Image from "next/image";
import type { PublicVehicleCard } from "@lv/contracts";

import { Card } from "@/components/ui/card";
import { CATEGORY_LABEL, TRANSMISSION_LABEL, formatCents } from "@/lib/utils";

/** Carte vehicule de la grille publique : prix de l'agence, deux actions dans l'application. */
export function VehicleCard({ vehicle, appHref }: { vehicle: PublicVehicleCard; appHref: string }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative h-40 bg-surface-muted">
        {vehicle.photoUrl ? (
          <Image
            src={vehicle.photoUrl}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            sizes="(min-width: 768px) 320px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="image-fallback h-full w-full" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-semibold text-ink-900">
          {vehicle.brand} {vehicle.model}
        </p>
        <p className="text-xs text-muted-foreground">
          {[
            CATEGORY_LABEL[vehicle.category],
            TRANSMISSION_LABEL[vehicle.transmission],
            `${vehicle.seats} places`,
          ].join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {vehicle.dailyCents !== null ? (
              <>
                <span className="text-base font-bold text-ink-900">
                  {formatCents(vehicle.dailyCents)}
                </span>{" "}
                / jour
              </>
            ) : (
              "Tarif sur demande"
            )}
          </p>
          <a
            href={appHref}
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Réserver
          </a>
        </div>
      </div>
    </Card>
  );
}
