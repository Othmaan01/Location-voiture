import type { Metadata } from "next";
import { Bell, CalendarCheck, LockKeyhole, MessageCircle, Search, Star } from "lucide-react";

import { Reveal } from "@/components/fx/reveal";
import { Tilt } from "@/components/fx/tilt";
import { PhoneMockup } from "@/components/marketing/phone-mockup";
import { SectionTitle } from "@/components/marketing/section";
import { StoreBadges } from "@/components/marketing/store-badges";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "L'application",
  description:
    "Trouvez un loueur vérifié, demandez une réservation, échangez et suivez votre location depuis l'application iPhone et Android.",
};

const FEATURES = [
  {
    Icon: Search,
    title: "Feed des loueurs",
    text: "Les pros près de vous, leurs flottes et leurs prix, sans créer de compte.",
  },
  {
    Icon: CalendarCheck,
    title: "Demande en deux minutes",
    text: "Dates, message, envoi. Le loueur confirme ou la demande expire d'elle-même.",
  },
  {
    Icon: MessageCircle,
    title: "Messages directs",
    text: "Un fil avec le loueur, avant et pendant la location.",
  },
  {
    Icon: Bell,
    title: "Suivi en temps réel",
    text: "Compte à rebours, adresse de l'agence, itinéraire, retour du véhicule.",
  },
  {
    Icon: Star,
    title: "Avis vérifiés",
    text: "Seuls les clients ayant loué peuvent noter. Le loueur répond.",
  },
  {
    Icon: LockKeyhole,
    title: "Sécurité",
    text: "Face ID, double authentification, données hébergées en Europe.",
  },
];

export default function AppPage() {
  const soon = !publicEnv.appStoreUrl && !publicEnv.playStoreUrl;
  return (
    <>
      <section className="border-b border-ink-200/60">
        <div className="container-page grid gap-12 py-16 [&>*]:min-w-0 md:grid-cols-[1fr_0.8fr] md:items-center md:py-24">
          <Reveal className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-tint">
              iPhone et Android
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
              <span className="glow-text">La location, sans le comptoir.</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-600 md:text-xl">
              Tout ce qu&apos;il faut pour louer chez un pro vérifié tient dans votre poche :
              recherche, demande, messages, suivi et avis.
            </p>
            <StoreBadges size="lg" />
            {soon ? (
              <p id="bientot" className="text-sm text-ink-500">
                L&apos;application est en cours de publication sur les stores. Laissez-nous votre
                adresse sur la page contact et vous serez prévenu le jour J.
              </p>
            ) : null}
          </Reveal>
          <Reveal delay={150}>
            <PhoneMockup />
          </Reveal>
        </div>
      </section>
      <section className="container-page py-20">
        <Reveal>
          <SectionTitle
            eyebrow="Dans l'application"
            title="Pensée pour le téléphone, pas adaptée après coup."
          />
        </Reveal>
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 80}>
                <Tilt className="glass h-full rounded-card p-6">
                  <Icon className="size-5 text-brand-tint" />
                  <p className="mt-3 text-lg font-bold text-ink-900">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{text}</p>
                </Tilt>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
