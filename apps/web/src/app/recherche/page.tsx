import type { Metadata } from "next";

import { AppCta } from "@/components/layout/app-cta";
import { SearchResults } from "@/components/loueurs/search-results";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { CATEGORY_LABEL } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rechercher un véhicule",
  description:
    "Recherchez un véhicule chez des loueurs professionnels vérifiés : ville, catégorie, boîte, prix.",
};

const HIDDEN = new Set(["utilitaire", "minibus"]);

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Recherche serveur (SEO) : memes parametres que l'application. */
export default async function SearchPage({ searchParams }: Search) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = new URLSearchParams({ limit: "48" });
  const q = pick("q");
  const citySlug = pick("citySlug");
  const categories = pick("categories");
  const transmission = pick("transmission");
  const sort = pick("sort");
  if (q) params.set("q", q);
  if (citySlug) params.set("citySlug", citySlug);
  if (categories) params.set("categories", categories);
  if (transmission) params.set("transmission", transmission);
  if (sort) params.set("sort", sort);
  const [results, cities] = await Promise.all([api.search(params), api.cities()]);
  const items = results?.items ?? [];
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-extrabold text-ink-900">Rechercher un véhicule</h1>
      <form
        className="mt-6 grid gap-3 rounded-card border border-ink-200 bg-surface p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
        method="get"
      >
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Marque, modèle ou ville"
          className="h-11 rounded-full border border-ink-200 bg-background px-4 text-sm text-ink-900 placeholder:text-ink-500"
        />
        <select
          name="citySlug"
          defaultValue={citySlug ?? ""}
          className="h-11 rounded-full border border-ink-200 bg-background px-4 text-sm text-ink-900"
        >
          <option value="">Toutes les villes</option>
          {(cities?.cities ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="categories"
          defaultValue={categories ?? ""}
          className="h-11 rounded-full border border-ink-200 bg-background px-4 text-sm text-ink-900"
        >
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABEL)
            .filter(([k]) => !HIDDEN.has(k))
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
        <select
          name="sort"
          defaultValue={sort ?? "relevance"}
          className="h-11 rounded-full border border-ink-200 bg-background px-4 text-sm text-ink-900"
        >
          <option value="relevance">Pertinence</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
        <button
          type="submit"
          className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Rechercher
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {results
          ? `${results.total} résultat${results.total > 1 ? "s" : ""}`
          : "Résultats indisponibles pour le moment"}
      </p>
      <div className="mt-4">
        <SearchResults items={items} />
      </div>
      <div className="mt-10 flex justify-center">
        <ButtonLink href="/villes" variant="outline">
          Parcourir par ville
        </ButtonLink>
      </div>
      <div className="mt-12">
        <AppCta />
      </div>
    </div>
  );
}
