import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, Wallet } from "lucide-react";

import { AppCta } from "@/components/layout/app-cta";
import { LoueurCard } from "@/components/loueurs/loueur-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { api } from "@/lib/api";
import { jsonLd, organizationSchema } from "@/lib/seo";

export const revalidate = 300;

/** Accueil = feed des loueurs verifies (ADR-0009), rendu cote serveur pour le referencement. */
export default async function HomePage() {
  const [feed, cities] = await Promise.all([api.feed("all", 12), api.cities()]);
  const items = feed?.items ?? [];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationSchema())} />
      <section className="hero-glow border-b border-ink-200">
        <div className="container-page grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
              Mise en relation directe
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-ink-900 md:text-5xl">
              Des loueurs de voitures professionnels, vérifiés, près de chez vous.
            </h1>
            <p className="max-w-xl text-lg text-ink-600">
              Comparez les flottes, demandez une réservation et échangez directement avec le loueur.
              Vous réglez le loueur, jamais la plateforme : aucune commission.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/recherche" size="lg">
                Rechercher un véhicule <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/pro" variant="outline" size="lg">
                Je suis loueur
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 self-center">
            {[
              {
                Icon: ShieldCheck,
                title: "Loueurs vérifiés",
                text: "Kbis, assurance et SIRET contrôlés avant publication.",
              },
              {
                Icon: Wallet,
                title: "Prix du loueur",
                text: "Le prix affiché est le sien. Aucun frais caché, aucune commission.",
              },
              {
                Icon: MessageCircle,
                title: "Contact direct",
                text: "Messages, réservation et suivi dans l'application.",
              },
            ].map(({ Icon, title, text }) => (
              <li
                key={title}
                className="flex gap-4 rounded-card border border-ink-200 bg-surface/70 p-4"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-tint" />
                <div>
                  <p className="font-semibold text-ink-900">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">Les loueurs</h2>
            <p className="text-sm text-muted-foreground">
              Flottes publiées et vérifiées, mises à jour en continu.
            </p>
          </div>
          <Link href="/recherche" className="text-sm font-semibold text-brand-tint">
            Tout explorer
          </Link>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="Les premiers loueurs arrivent"
            description="Les loueurs vérifiés apparaîtront ici dès la publication de leur flotte."
            action={<ButtonLink href="/pro">Publier ma flotte</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <div key={l.id} className="relative">
                <LoueurCard loueur={l} />
              </div>
            ))}
          </div>
        )}
      </section>

      {cities && cities.cities.length > 0 ? (
        <section className="container-page pb-14">
          <h2 className="text-xl font-bold text-ink-900">Location de voiture par ville</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.cities.slice(0, 24).map((c) => (
              <Link
                key={c.slug}
                href={`/location-voiture/${c.slug}`}
                className="rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 hover:text-ink-900"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="container-page pb-14">
        <AppCta />
      </div>
    </>
  );
}
