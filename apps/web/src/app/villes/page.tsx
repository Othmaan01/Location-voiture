import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/card";
import { api } from "@/lib/api";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Location de voiture par ville",
  description: "Toutes les villes où trouver un agence de location vérifiée.",
};

export default async function CitiesPage() {
  const cities = await api.cities();
  const list = cities?.cities ?? [];
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-extrabold text-ink-900">Location de voiture par ville</h1>
      <p className="mt-2 text-muted-foreground">
        Choisissez une ville pour voir les véhicules disponibles autour.
      </p>
      {list.length === 0 ? (
        <EmptyState className="mt-8" title="Aucune ville pour le moment" />
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/location-voiture/${c.slug}`}
                className="block rounded-card border border-ink-200 bg-surface px-5 py-4 font-semibold text-ink-900 hover:border-ink-300"
              >
                {c.name}
                {c.departmentCode ? (
                  <span className="ml-2 text-xs font-medium text-muted-foreground">
                    ({c.departmentCode})
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
