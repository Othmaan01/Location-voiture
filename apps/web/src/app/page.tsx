import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

import { Reveal } from "@/components/fx/reveal";
import { Tilt } from "@/components/fx/tilt";
import { LoueurCard } from "@/components/loueurs/loueur-card";
import { Faq } from "@/components/marketing/faq";
import { PhoneMockup } from "@/components/marketing/phone-mockup";
import { SectionTitle } from "@/components/marketing/section";
import { StoreBadges } from "@/components/marketing/store-badges";
import { TrustRow } from "@/components/marketing/trust-row";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { api } from "@/lib/api";
import { jsonLd, organizationSchema } from "@/lib/seo";

export const revalidate = 300;

const STEPS = [
  {
    Icon: Search,
    title: "Trouvez",
    text: "Les loueurs pros vérifiés autour de vous, leurs véhicules et leurs vrais prix, en un coup d'œil.",
  },
  {
    Icon: CalendarCheck,
    title: "Demandez",
    text: "Choisissez vos dates. Le loueur confirme rapidement, ou la demande s'efface d'elle-même.",
  },
  {
    Icon: MessageCircle,
    title: "Roulez",
    text: "Vous échangez avec lui, récupérez le véhicule à l'agence et payez sur place. Sans surprise.",
  },
];

const PROMISES = [
  {
    Icon: ShieldCheck,
    title: "Chaque loueur est contrôlé",
    text: "Kbis, assurance flotte et SIRET vérifiés à la main avant qu'un seul véhicule soit visible.",
  },
  {
    Icon: Wallet,
    title: "Le prix affiché est le prix payé",
    text: "Nous ne prenons aucune commission sur votre location. Vous réglez le loueur, directement.",
  },
  {
    Icon: MessageCircle,
    title: "Un vrai interlocuteur",
    text: "Vous parlez à la personne qui vous remet les clés. Pas de centre d'appels, pas de robot.",
  },
  {
    Icon: Star,
    title: "Des avis de vrais clients",
    text: "Seuls les clients qui ont réellement loué peuvent noter. Le loueur répond publiquement.",
  },
];

const FAQ = [
  {
    q: "Est-ce que je paie quelque chose à la plateforme ?",
    a: "Non. L'application est gratuite pour les clients et nous ne prenons aucune commission. Vous payez le loueur, au prix qu'il affiche, directement à l'agence.",
  },
  {
    q: "Comment savez-vous qu'un loueur est sérieux ?",
    a: "Avant publication, nous vérifions son immatriculation (Kbis), son assurance flotte et le SIRET de chaque agence. Ensuite, ce sont les avis des clients qui ont vraiment loué qui font foi.",
  },
  {
    q: "Que se passe-t-il après ma demande ?",
    a: "Le loueur reçoit une notification et vous répond dans l'application. Une fois confirmé, vous recevez l'adresse et le téléphone de l'agence, puis vous suivez votre location jusqu'au retour.",
  },
  {
    q: "Puis-je annuler ?",
    a: "Oui, tant que la location n'a pas commencé, depuis l'application. Le loueur est prévenu immédiatement.",
  },
  {
    q: "L'application est-elle disponible sur iPhone et Android ?",
    a: "Oui, sur l'App Store et Google Play. Le site vous permet de découvrir les loueurs ; la réservation et les messages se font dans l'application.",
  },
];

/** Accueil : promesse en une phrase, preuves, feed des loueurs, parcours, engagements, loueurs, FAQ. */
export default async function HomePage() {
  const [feed, cities] = await Promise.all([api.feed("all", 6), api.cities()]);
  const items = feed?.items ?? [];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationSchema())} />

      <section className="border-b border-ink-200/60">
        <div className="container-page grid gap-12 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-24">
          <Reveal className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
              <span className="ring-pulse size-1.5 rounded-full bg-brand" /> Location de voiture
              entre pros et particuliers
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
              <span className="glow-text">Louez chez un pro vérifié,</span>
              <br />
              <span className="text-ink-900">au prix du loueur.</span>
              <br />
              <span className="text-ink-900">Sans commission.</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-600 md:text-xl">
              Les loueurs professionnels près de chez vous, leurs vrais prix, et un contact direct.
              Vous demandez, il confirme, vous roulez.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <StoreBadges size="lg" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-600">
              <Link
                href="/recherche"
                className="inline-flex items-center gap-1 font-semibold text-ink-900 hover:text-brand-tint"
              >
                Voir les véhicules sans l&apos;application <ArrowRight className="size-4" />
              </Link>
              <span className="hidden h-4 w-px bg-ink-300 sm:block" />
              <Link href="/pro" className="font-semibold text-ink-900 hover:text-brand-tint">
                Je suis loueur
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150} className="hidden md:block">
            <PhoneMockup />
          </Reveal>
        </div>
        <div className="container-page pb-10">
          <Reveal delay={200}>
            <TrustRow />
          </Reveal>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <SectionTitle
            eyebrow="Simple, vraiment"
            title="Trois étapes. Zéro intermédiaire."
            text="Tout ce que vous détestez dans la location, en moins : pas de frais cachés, pas d'attente au comptoir, pas de conditions écrites en petit."
          />
        </Reveal>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 120}>
                <Tilt className="glass h-full rounded-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-tint">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-bold text-ink-400">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-xl font-bold text-ink-900">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{text}</p>
                </Tilt>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page pb-20">
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <SectionTitle
            eyebrow="En ce moment"
            title="Des loueurs, pas des annonces."
            text="Chaque profil est une vraie entreprise, avec ses agences, sa flotte et ses avis."
          />
          <Link
            href="/recherche"
            className="hidden shrink-0 text-sm font-semibold text-brand-tint md:block"
          >
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

      <section className="border-y border-ink-200/60 bg-surface/40">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <Reveal>
            <SectionTitle
              eyebrow="Nos engagements"
              title="La confiance ne se décrète pas. Elle se vérifie."
              text="Nous avons construit la plateforme comme nous aurions voulu la trouver : transparente sur les prix, stricte sur qui peut louer, honnête sur les avis."
            />
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ink-200 bg-surface p-4">
              <BadgeCheck className="size-8 shrink-0 text-brand-tint" />
              <p className="text-sm text-ink-600">
                <span className="font-bold text-ink-900">Zéro commission, c&apos;est écrit.</span>{" "}
                Notre revenu vient de l&apos;abonnement des loueurs, jamais de vos locations.
              </p>
            </div>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PROMISES.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 100}>
                  <Tilt className="glass h-full rounded-card p-5">
                    <Icon className="size-5 text-brand-tint" />
                    <p className="mt-3 font-bold text-ink-900">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{text}</p>
                  </Tilt>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-card border-brand/30 p-8 md:p-12">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-tint">
                  Vous louez des voitures ?
                </p>
                <h2 className="text-3xl font-extrabold text-ink-900 md:text-4xl">
                  Remplissez votre planning sans reverser un centime par location.
                </h2>
                <p className="text-ink-600 md:text-lg">
                  Un abonnement fixe, indexé sur le nombre de véhicules publiés. Vos clients, vos
                  prix, votre relation. Essai gratuit 14 jours.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <ButtonLink href="/pro" size="lg" className="btn-glow">
                    Découvrir l&apos;offre loueur <ArrowRight />
                  </ButtonLink>
                  <ButtonLink href="/tarifs" variant="outline" size="lg">
                    Voir les tarifs
                  </ButtonLink>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-4 md:grid-cols-1">
                {[
                  ["0 %", "de commission"],
                  ["14 j", "d'essai gratuit"],
                  ["dès 29 €", "par mois HT"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-ink-200 bg-surface/70 p-4">
                    <dd className="text-2xl font-extrabold text-ink-900 md:text-3xl">{v}</dd>
                    <dt className="text-xs text-ink-500">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </section>

      {cities && cities.cities.length > 0 ? (
        <section className="container-page pb-6">
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

      <Faq items={FAQ} />

      <section className="container-page pb-20">
        <Reveal>
          <div className="glass rounded-card p-8 text-center md:p-14">
            <h2 className="text-3xl font-extrabold text-ink-900 md:text-4xl">
              Votre prochaine voiture est à côté de chez vous.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-600 md:text-lg">
              Téléchargez l&apos;application, trouvez un loueur vérifié et envoyez votre demande en
              moins de deux minutes.
            </p>
            <StoreBadges size="lg" className="mt-8 justify-center" />
          </div>
        </Reveal>
      </section>
    </>
  );
}
