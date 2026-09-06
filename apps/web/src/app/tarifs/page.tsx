import type { Metadata } from "next";
import { Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCents } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Abonnement loueur : tarifs",
  description:
    "Un abonnement mensuel indexé sur le nombre de véhicules publiés, 14 jours d'essai, aucune commission sur vos locations.",
};

export default async function PricingPage() {
  const plans = (await api.plans())?.plans ?? [];
  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">Loueurs</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-900">
          Un abonnement simple, aucune commission
        </h1>
        <p className="mt-3 text-muted-foreground">
          Le prix dépend d&apos;une seule chose : le nombre de véhicules que vous publiez. Vos
          clients vous règlent directement. 14 jours d&apos;essai gratuit, résiliable à tout moment.
          Prix hors taxes.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div
            key={p.code}
            className="flex flex-col rounded-card border border-ink-200 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-ink-900">{p.name}</p>
              {p.code === "pro" ? <Badge variant="accent">Populaire</Badge> : null}
            </div>
            <p className="mt-4 text-3xl font-extrabold text-ink-900">
              {p.isQuote ? "Sur devis" : formatCents(p.monthlyPriceCents)}
              {!p.isQuote ? (
                <span className="text-sm font-semibold text-muted-foreground"> / mois</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.maxVehicles
                ? `${p.minVehicles} à ${p.maxVehicles} véhicules publiés`
                : `${p.minVehicles} véhicules et plus`}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-700">
              {[
                "Profil et flotte visibles dans l'application",
                "Demandes, messages et calendrier",
                "Avis clients et réponses",
                "Aucune commission",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <ButtonLink
              href={p.isQuote ? "/contact" : "/pro#application"}
              className="mt-6"
              variant={p.code === "pro" ? "primary" : "outline"}
            >
              {p.isQuote ? "Nous contacter" : "Commencer l'essai"}
            </ButtonLink>
          </div>
        ))}
      </div>
    </div>
  );
}
