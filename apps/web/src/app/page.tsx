import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, Wallet } from "lucide-react";

import { Reveal } from "@/components/fx/reveal";
import { Tilt } from "@/components/fx/tilt";
import { AppCta } from "@/components/layout/app-cta";
import { LoueurCard } from "@/components/loueurs/loueur-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { api } from "@/lib/api";
import { jsonLd, organizationSchema } from "@/lib/seo";

export const revalidate = 300;

const PILLARS = [
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
];

/** Accueil = feed des loueurs verifies (ADR-0009), rendu cote serveur pour le referencement. */
export default async function HomePage() {
  const [feed, cities] = await Promise.all([api.feed("all", 12), api.cities()]);
  const items = feed?.items ?? [];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationSchema())} />
      <section className="border-b border-ink-200/60">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <Reveal className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
              <span className="ring-pulse size-1.5 rounded-full bg-brand" /> Mise en relation
              directe
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              <span className="glow-text">Des loueurs de voitures professionnels, vérifiés,</span>
              <br />
              <span className="text-ink-900">près de chez vous.</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-600">
              Comparez les flottes, demandez une réservation et échangez directement avec le loueur.
              Vous réglez le loueur, jamais la plateforme : aucune commission.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/recherche" size="lg" className="btn-glow">
                Rechercher un véhicule <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/pro" variant="outline" size="lg" className="glass">
                Je suis loueur
              </ButtonLink>
            </div>
          </Reveal>
          <ul className="grid gap-3 self-center">
            {PILLARS.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={120 + i * 120}>
                  <Tilt className="glass flex gap-4 rounded-card p-4">
                    <Icon className="mt-0.5 size-5 shrink-0 text-brand-tint" />
                    <div>
                      <p className="font-semibold text-ink-900">{title}</p>
                      <p className="text-sm text-muted-foreground">{text}</p>
                    </div>
                  </Tilt>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-14">
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">Les loueurs</h2>
            <p className="text-sm text-muted-foreground">
              Flottes publiées et vérifiées, mises à jour en continu.
            </p>
          </div>
          <Link href="/recherche" className="text-sm font-semibold text-brand-tint">
            Tout explorer
          </Link>
        </Reveal>
        {items.length === 0 ? (
          <Reveal>
            <EmptyState
              title="Les premiers loueurs arrivent"
              description="Les loueurs vérifiés apparaîtront ici dès la publication de leur flotte."
              action={<ButtonLink href="/pro">Publier ma flotte</ButtonLink>}
            />
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l, i) => (
              <Reveal key={l.id} delay={(i % 3) * 90}>
                <Tilt className="relative rounded-card">
                  <LoueurCard loueur={l} />
                </Tilt>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {cities && cities.cities.length > 0 ? (
        <section className="container-page pb-14">
          <Reveal>
            <h2 className="text-xl font-bold text-ink-900">Location de voiture par ville</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {cities.cities.slice(0, 24).map((c) => (
                <Link
                  key={c.slug}
                  href={`/location-voiture/${c.slug}`}
                  className="glass rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      <div className="container-page pb-14">
        <Reveal>
          <AppCta />
        </Reveal>
      </div>
    </>
  );
}
