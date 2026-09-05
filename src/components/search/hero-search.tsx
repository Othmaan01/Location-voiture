"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GeolocateButton } from "@/components/search/geolocate-button";
import { Input, Select } from "@/components/ui/field";
import { VEHICLE_CATEGORIES } from "@/lib/constants";
import { buildSearchQuery } from "@/lib/search-params";
import type { CityOption } from "@/components/search/search-shell";

export function HeroSearch({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === citySlug),
    [cities, citySlug],
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const qs = buildSearchQuery({
      q: query || undefined,
      citySlug: citySlug || undefined,
      lat: selectedCity?.latitude,
      lng: selectedCity?.longitude,
      categories: category ? [category] : [],
      radiusKm: 30,
      sort: "pertinence",
      page: 1,
    });
    router.push(`/recherche${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-3">
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-ink-100 bg-surface/95 p-2 shadow-lift backdrop-blur sm:grid-cols-[1.2fr_1fr_1fr_auto]"
    >
      <Select
        value={citySlug}
        onChange={(e) => setCitySlug(e.target.value)}
        aria-label="Ville"
        className="border-transparent shadow-none focus:border-ink-200"
      >
        <option value="">Ou cherchez-vous ?</option>
        {cities.map((city) => (
          <option key={city.id} value={city.slug}>
            {city.name}
            {city.department_code ? ` (${city.department_code})` : ""}
          </option>
        ))}
      </Select>

      <Select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Type de vehicule"
        className="border-transparent shadow-none focus:border-ink-200"
      >
        <option value="">Tous les vehicules</option>
        {VEHICLE_CATEGORIES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Marque ou modele"
        aria-label="Marque ou modele"
        className="border-transparent shadow-none focus:border-ink-200"
      />

      <Button type="submit" size="lg" className="sm:px-6">
        <Search /> Rechercher
      </Button>
    </form>

    {/* Sur telephone, chercher "pres de moi" est le geste par defaut. */}
    <GeolocateButton
      className="w-full sm:w-auto"
      variant="ghost"
      size="sm"
      label="Chercher autour de moi"
    />
    </div>
  );
}
