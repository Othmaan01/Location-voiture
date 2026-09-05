"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon, List, Loader2, SlidersHorizontal, X } from "lucide-react";

import { MapCanvas, type MapPoint } from "@/components/map/lazy-map";
import { GeolocateButton } from "@/components/search/geolocate-button";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import {
  FRANCE_CENTER,
  FUELS,
  SORT_OPTIONS,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  VEHICLE_OPTIONS,
} from "@/lib/constants";
import {
  buildSearchQuery,
  countActiveFilters,
  initialZoomFor,
  type SearchFilters,
} from "@/lib/search-params";
import { cn, formatPrice } from "@/lib/utils";
import type { VehicleSearchResult } from "@/types/database";

export interface CityOption {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  department_code: string | null;
}

interface SearchShellProps {
  filters: SearchFilters;
  results: VehicleSearchResult[];
  total: number;
  pageCount: number;
  cities: CityOption[];
}

const RADIUS_STEPS = [5, 10, 20, 30, 50, 100, 200];

export function SearchShell({ filters, results, total, pageCount, cities }: SearchShellProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"liste" | "carte">("liste");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = countActiveFilters(filters);

  const center = useMemo<[number, number]>(() => {
    if (filters.lng !== undefined && filters.lat !== undefined) return [filters.lng, filters.lat];
    const city = cities.find((c) => c.slug === filters.citySlug);
    if (city) return [city.longitude, city.latitude];
    return FRANCE_CENTER;
  }, [filters.lat, filters.lng, filters.citySlug, cities]);

  const points = useMemo<MapPoint[]>(
    () =>
      results
        .filter((v) => v.latitude !== null && v.longitude !== null)
        .map((v) => ({
          id: v.id,
          latitude: v.latitude as number,
          longitude: v.longitude as number,
          label: `${Math.round(v.price_per_day)}€`,
          featured: v.is_featured,
        })),
    [results],
  );

  function update(patch: Partial<SearchFilters>, resetPage = true) {
    const next: SearchFilters = {
      ...filters,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? filters.page),
    };
    startTransition(() => {
      router.push(`/recherche?${buildSearchQuery(next)}`, { scroll: false });
    });
  }

  function toggleIn(key: "categories" | "transmissions" | "fuels" | "options", value: string) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next } as Partial<SearchFilters>);
  }

  function onCityChange(slug: string) {
    const city = cities.find((c) => c.slug === slug);
    update({
      citySlug: slug || undefined,
      lat: city?.latitude,
      lng: city?.longitude,
    });
  }

  const filtersPanel = (
    <div className="space-y-6">
      <GeolocateButton className="w-full" size="sm" />

      <Field label="Ville">
        <Select value={filters.citySlug ?? ""} onChange={(e) => onCityChange(e.target.value)}>
          <option value="">Toute la France</option>
          {cities.map((city) => (
            <option key={city.id} value={city.slug}>
              {city.name}
              {city.department_code ? ` (${city.department_code})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {filters.citySlug || (filters.lat !== undefined && filters.lng !== undefined) ? (
        <Field label={`Rayon de recherche : ${filters.radiusKm} km`}>
          <input
            type="range"
            min={0}
            max={RADIUS_STEPS.length - 1}
            step={1}
            value={Math.max(RADIUS_STEPS.indexOf(filters.radiusKm), 0)}
            onChange={(e) => update({ radiusKm: RADIUS_STEPS[Number(e.target.value)] })}
            className="w-full accent-ink-900"
            aria-label="Rayon de recherche en kilometres"
          />
          <div className="flex justify-between text-[10px] text-ink-400">
            <span>{RADIUS_STEPS[0]} km</span>
            <span>{RADIUS_STEPS[RADIUS_STEPS.length - 1]} km</span>
          </div>
        </Field>
      ) : null}

      <Field label="Budget par jour">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={filters.minPrice ?? ""}
            onBlur={(e) =>
              update({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <span className="text-ink-300">-</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={filters.maxPrice ?? ""}
            onBlur={(e) =>
              update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </Field>

      <FilterGroup title="Categorie">
        {VEHICLE_CATEGORIES.map((item) => (
          <CheckLine
            key={item.value}
            label={item.label}
            checked={filters.categories.includes(item.value)}
            onChange={() => toggleIn("categories", item.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Boite de vitesses">
        {TRANSMISSIONS.map((item) => (
          <CheckLine
            key={item.value}
            label={item.label}
            checked={filters.transmissions.includes(item.value)}
            onChange={() => toggleIn("transmissions", item.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Energie">
        {FUELS.map((item) => (
          <CheckLine
            key={item.value}
            label={item.label}
            checked={filters.fuels.includes(item.value)}
            onChange={() => toggleIn("fuels", item.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Equipements">
        {VEHICLE_OPTIONS.map((item) => (
          <CheckLine
            key={item.value}
            label={item.label}
            checked={filters.options.includes(item.value)}
            onChange={() => toggleIn("options", item.value)}
          />
        ))}
      </FilterGroup>

      <Field label="Nombre de places minimum">
        <Select
          value={filters.minSeats ?? ""}
          onChange={(e) =>
            update({ minSeats: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">Peu importe</option>
          {[2, 4, 5, 7, 9].map((n) => (
            <option key={n} value={n}>
              {n} places et plus
            </option>
          ))}
        </Select>
      </Field>

      {activeFilterCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() =>
            update({
              categories: [],
              transmissions: [],
              fuels: [],
              options: [],
              minPrice: undefined,
              maxPrice: undefined,
              minSeats: undefined,
            })
          }
        >
          <X /> Effacer les filtres ({activeFilterCount})
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="container-page py-6">
      {/* Barre de recherche */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            defaultValue={filters.q ?? ""}
            placeholder="Marque, modele ou nom d'agence..."
            onKeyDown={(e) => {
              if (e.key === "Enter")
                update({ q: (e.target as HTMLInputElement).value || undefined });
            }}
            onBlur={(e) => {
              if ((e.target.value || undefined) !== filters.q)
                update({ q: e.target.value || undefined });
            }}
            aria-label="Recherche libre"
          />
        </div>
        <Select
          className="sm:w-52"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label="Trier les resultats"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal /> Filtres
          {activeFilterCount > 0 ? (
            <Badge variant="ink" className="ml-1">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        {/* Filtres desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-card border border-ink-100 bg-surface p-5 shadow-soft">
            {filtersPanel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Recherche...
                </span>
              ) : (
                <>
                  <strong className="font-semibold text-ink-900">{total}</strong> vehicule
                  {total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
                </>
              )}
            </p>

            <div className="inline-flex rounded-full border border-ink-200 p-0.5 xl:hidden">
              {(["liste", "carte"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setMobileView(view)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize",
                    mobileView === view ? "bg-ink-900 text-white" : "text-ink-600",
                  )}
                >
                  {view === "liste" ? (
                    <List className="size-3.5" />
                  ) : (
                    <MapIcon className="size-3.5" />
                  )}
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_26rem]">
            <div className={cn(mobileView === "carte" ? "hidden xl:block" : "")}>
              {results.length === 0 ? (
                <EmptyState
                  title="Aucun vehicule ne correspond a votre recherche"
                  description="Elargissez le rayon, retirez quelques filtres, ou explorez une autre ville."
                  action={
                    <Button variant="outline" size="sm" onClick={() => router.push("/recherche")}>
                      Reinitialiser la recherche
                    </Button>
                  }
                />
              ) : (
                <div
                  className={cn(
                    "grid gap-4 sm:grid-cols-2 xl:grid-cols-2",
                    pending && "pointer-events-none opacity-60",
                  )}
                >
                  {results.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      active={activeId === vehicle.id}
                      onHover={setActiveId}
                    />
                  ))}
                </div>
              )}

              {pageCount > 1 ? (
                <nav
                  className="mt-8 flex items-center justify-center gap-2"
                  aria-label="Pagination"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => update({ page: filters.page - 1 }, false)}
                  >
                    Precedent
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {filters.page} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= pageCount}
                    onClick={() => update({ page: filters.page + 1 }, false)}
                  >
                    Suivant
                  </Button>
                </nav>
              ) : null}
            </div>

            {/* Carte */}
            <div
              className={cn(
                "h-[calc(100dvh-14rem)] min-h-80 overflow-hidden rounded-card border border-ink-100 shadow-soft xl:sticky xl:top-24 xl:h-[calc(100dvh-8rem)]",
                mobileView === "liste" ? "hidden xl:block" : "",
              )}
            >
              <MapCanvas
                points={points}
                center={center}
                zoom={initialZoomFor(filters)}
                activeId={activeId}
                onSelect={(id) => {
                  setActiveId(id);
                  document
                    .getElementById(`vehicule-${id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres mobile */}
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setFiltersOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-2xl bg-surface shadow-lift">
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-ink-200" />
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 p-4">
              <p className="font-semibold">Filtres</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFiltersOpen(false)}
                aria-label="Fermer"
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div
              className="border-t border-ink-100 p-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>
                Voir {total} resultat{total > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <p className="sr-only">
          A partir de {formatPrice(Math.min(...results.map((r) => r.price_per_day)))} par jour.
        </p>
      ) : null}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-t border-ink-100 pt-4 first:border-t-0 first:pt-0">
      <summary className="mb-2 cursor-pointer list-none text-sm font-medium text-ink-800 marker:hidden">
        {title}
      </summary>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">{children}</div>
    </details>
  );
}

function CheckLine({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm text-ink-700 hover:bg-surface-muted">
      <Checkbox checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
