import type { Metadata } from "next";

import { SearchShell, type CityOption } from "@/components/search/search-shell";
import { listCities, searchVehicles } from "@/lib/queries";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Rechercher un vehicule de location",
  description:
    "Carte interactive de tous les loueurs de voitures : filtrez par ville, categorie, budget, boite et energie, puis contactez l'agence directement.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseSearchParams(params);

  const [results, cities] = await Promise.all([searchVehicles(filters), listCities(300)]);

  const cityOptions: CityOption[] = cities.map((city) => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    latitude: city.latitude,
    longitude: city.longitude,
    department_code: city.department_code,
  }));

  return (
    <SearchShell
      filters={filters}
      results={results.items}
      total={results.total}
      pageCount={results.pageCount}
      cities={cityOptions}
    />
  );
}
