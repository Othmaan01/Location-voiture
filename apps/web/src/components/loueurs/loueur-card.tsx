import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Star } from "lucide-react";
import type { LoueurSummary } from "@lv/contracts";

import { Badge, Card } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";

/** Carte du feed (ADR-0009) : identite, trois vignettes, "des X €/j". */
export function LoueurCard({ loueur }: { loueur: LoueurSummary }) {
  return (
    <Card className="group flex flex-col gap-4 p-5 transition-colors hover:border-ink-300">
      <div className="flex items-center gap-3">
        <Avatar name={loueur.name} uri={loueur.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/loueurs/${loueur.id}`} className="truncate font-semibold text-ink-900">
              <span className="absolute inset-0" aria-hidden />
              {loueur.name}
            </Link>
            {loueur.verified ? (
              <Badge variant="accent">
                <ShieldCheck className="size-3" /> Vérifié
              </Badge>
            ) : null}
          </div>
          {loueur.cityName ? (
            <p className="truncate text-xs text-muted-foreground">{loueur.cityName}</p>
          ) : null}
        </div>
        {loueur.ratingAverage !== null ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-ink-900">
            <Star className="size-3.5 fill-current" />{" "}
            {loueur.ratingAverage.toLocaleString("fr-FR")}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => {
          const t = loueur.thumbnails[i];
          return t?.photoUrl ? (
            <div key={t.id} className="relative h-20 overflow-hidden rounded-lg bg-surface-muted">
              <Image
                src={t.photoUrl}
                alt={`${t.brand} ${t.model}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              key={t?.id ?? `e-${i}`}
              className="image-fallback h-20 rounded-lg border border-ink-200"
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {loueur.vehicleCount} véhicule{loueur.vehicleCount > 1 ? "s" : ""}
          {loueur.fromDailyCents !== null ? (
            <>
              {" · dès "}
              <span className="font-semibold text-ink-900">
                {formatCents(loueur.fromDailyCents)}/j
              </span>
            </>
          ) : null}
        </p>
        <Link
          href={`/loueurs/${loueur.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-tint"
        >
          Voir l&apos;agence <ChevronRight className="size-4" />
        </Link>
      </div>
    </Card>
  );
}

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name: string;
  uri: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-surface-muted font-bold text-ink-900"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {uri ? (
        <Image src={uri} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        initials || "?"
      )}
    </div>
  );
}
