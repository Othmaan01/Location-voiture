import type { Metadata } from "next";
import { CalendarDays, MessageCircle, ShieldCheck, Smartphone, Star, Wallet } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Loueurs : publiez votre flotte",
  description:
    "Publiez vos véhicules, recevez des demandes de réservation et gérez votre planning depuis l'application. Vérification des loueurs, aucune commission.",
};

const STEPS = [
  {
    Icon: ShieldCheck,
    title: "Vérification",
    text: "SIREN, Kbis et assurance contrôlés : un gage de confiance pour vos clients.",
  },
  {
    Icon: CalendarDays,
    title: "Flotte et planning",
    text: "Photos, tarifs, agences et calendrier de disponibilité, tout dans l'application.",
  },
  {
    Icon: MessageCircle,
    title: "Demandes et messages",
    text: "Acceptez ou refusez en deux gestes, échangez avec le client, suivez la location.",
  },
  {
    Icon: Star,
    title: "Avis",
    text: "Les avis après location renforcent votre profil ; vous y répondez publiquement.",
  },
  {
    Icon: Wallet,
    title: "Aucune commission",
    text: "Un abonnement mensuel indexé sur vos véhicules publiés. Le client vous règle directement.",
  },
];

export default function ProPage() {
  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
          Loueurs professionnels
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-900 md:text-4xl">
          Votre flotte devant des clients qui cherchent à louer près de chez vous.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tout se pilote depuis l&apos;application, sur votre téléphone : création de l&apos;espace,
          vérification, véhicules, demandes, messages et abonnement.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="#application" size="lg">
            <Smartphone /> Obtenir l&apos;application
          </ButtonLink>
          <ButtonLink href="/tarifs" variant="outline" size="lg">
            Voir les tarifs
          </ButtonLink>
        </div>
      </div>
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(({ Icon, title, text }) => (
          <li key={title} className="rounded-card border border-ink-200 bg-surface p-5">
            <Icon className="size-5 text-brand-tint" />
            <p className="mt-3 font-semibold text-ink-900">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
      <section
        id="application"
        className="mt-14 rounded-card border border-brand/30 bg-brand-soft/60 p-8"
      >
        <h2 className="text-2xl font-bold text-ink-900">
          L&apos;application arrive sur l&apos;App Store et Google Play
        </h2>
        <p className="mt-2 max-w-xl text-ink-700">
          Les liens de téléchargement seront affichés ici dès la publication. En attendant,
          laissez-nous votre adresse et nous vous prévenons.
        </p>
        <ButtonLink href="/contact" className="mt-5" variant="outline">
          Être prévenu
        </ButtonLink>
      </section>
    </div>
  );
}
