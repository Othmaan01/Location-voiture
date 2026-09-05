"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

export type { MapPoint } from "@/components/map/types";

/** Fond neutre affiche pendant le chargement de MapLibre. */
export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-surface-muted",
        className,
      )}
      aria-hidden
    >
      <span className="flex items-center gap-2 text-xs text-ink-400">
        <span className="size-3 animate-pulse rounded-full bg-ink-300" />
        Chargement de la carte...
      </span>
    </div>
  );
}

/**
 * MapLibre pese environ 250 ko de JavaScript. Sur mobile, c'est la piece la
 * plus lourde du site : on la charge donc a la demande, apres le rendu, et
 * jamais cote serveur (la librairie a besoin du DOM).
 *
 * Toujours importer la carte depuis ce module, pas depuis `map-canvas`.
 */
export const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);
