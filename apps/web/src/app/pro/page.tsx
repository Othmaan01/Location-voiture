import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  Globe,
  MessageCircle,
  ShieldCheck,
  Star,
  Wallet,
  X,
} from "lucide-react";

import { Reveal } from "@/components/fx/reveal";
import { Tilt } from "@/components/fx/tilt";
import { Faq } from "@/components/marketing/faq";
import { SectionTitle } from "@/components/marketing/section";
import { StoreBadges } from "@/components/marketing/store-badges";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Loueurs : vos véhicules devant des clients, sans commission",
  description:
    "Loueurs de voitures : publiez votre flotte, recevez des demandes et encaissez comme vous voulez. 0 % de commission, page web dédiée et référencement local offerts, abonnement fixe dès 29 € HT, 14 jours d'essai.",
};

const BENEFITS = [
  {
    Icon: Wallet,
    title: "0 % de commission, des deux côtés",
    text: "Ni sur vos locations, ni sur vos clients. Un abonnement fixe et connu d'avance, c'est tout.",
  },
  {
    Icon: Banknote,
    title: "Vous encaissez comme vous voulez",
    text: "Carte, virement, espèces dans la limite légale : le client vous règle à l'agence, avec votre contrat et vos conditions.",
  },
  {
    Icon: Globe,
    title: "Page web et référencement local offerts",
    text: "Chaque agence a sa page sur notre site, optimisée pour « location de voiture à votre ville » sur Google. Un gain de visibilité, sans agence SEO.",
  },
  {
    Icon: ShieldCheck,
    title: "Le label « vérifié »",
    text: "SIREN, Kbis et assurance contrôlés : les clients savent qu'ils ont affaire à un professionnel.",
  },
  {
    Icon: MessageCircle,
    title: "Vos clients, votre relation",
    text: "Demandes, messages et coordonnées dans l'application. Aucun intermédiaire entre vous et eux.",
  },
  {
    Icon: CalendarDays,
    title: "Flotte et planning dans la poche",
    text: "Agences, véhicules, photos, tarifs, blocages, notifications : tout se pilote depuis votre téléphone.",
  },
  {
    Icon: Star,
    title: "Des avis qui vous appartiennent",
    text: "Seuls vos vrais clients peuvent noter, et vous répondez publiquement. Votre réputation travaille pour vous.",
  },
];

const COMPARE = [
  ["Commission sur chaque location", "15 à 30 %", "0 %"],
  ["Frais facturés au client", "Oui, souvent cachés", "Aucun"],
  [
    "Encaissement",
    "Par la plateforme, reversé plus tard",
    "Chez vous, immédiat, carte ou espèces (limite légale)",
  ],
  ["Relation avec le client", "Via la plateforme", "Directe, dans l'app"],
  ["Visibilité web locale", "En option payante", "Page dédiée + référencement, offerts"],
  ["Coût", "Variable, imprévisible", "Abonnement fixe dès 29 € HT"],
];

const STEPS = [
  ["Créez votre espace", "Inscription en deux minutes, SIREN retrouvé automatiquement."],
  ["Faites-vous vérifier", "Kbis et assurance envoyés depuis l'app. Réponse sous 48 h."],
  ["Publiez votre flotte", "Agences, véhicules, photos et tarifs. Essai gratuit 14 jours."],
  ["Recevez des demandes", "Notification, acceptation en deux gestes, suivi jusqu'au retour."],
];

const FAQ = [
  {
    q: "Combien ça coûte vraiment ?",
    a: "Un abonnement mensuel hors taxes selon le nombre de véhicules publiés : Starter 29 € (1 à 3), Pro 79 € (4 à 10), Business 179 € (11 à 30), sur devis au-delà. Aucune commission, aucun frais d'inscription. 14 jours d'essai gratuit, résiliable à tout moment.",
  },
  {
    q: "Qui encaisse la location ?",
    a: "Vous, directement, à l'agence, avec vos conditions habituelles (caution, contrat, état des lieux). La plateforme ne touche jamais l'argent de vos clients.",
  },
  {
    q: "Que dois-je fournir pour être vérifié ?",
    a: "Votre Kbis de moins de trois mois, votre attestation d'assurance flotte et le SIRET de chaque agence. Nos équipes vérifient à la main.",
  },
  {
    q: "Puis-je gérer plusieurs agences et plusieurs collaborateurs ?",
    a: "Oui. Chaque agence a son adresse, ses horaires et son SIRET. Vous invitez des managers et des agents avec des droits distincts.",
  },
  {
    q: "Et si un client ne vient pas ?",
    a: "Vous signalez le « no-show » depuis la réservation. Les litiges sont tranchés par notre équipe avec les éléments des deux parties.",
  },
];

export default function ProPage() {
  return (
    <>
      <section className="border-b border-ink-200/60">
        <div className="container-page grid gap-10 py-16 [&>*]:min-w-0 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <Reveal className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-tint">
              Loueurs professionnels
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
              <span className="glow-text">Des clients près de chez vous.</span>
              <br />
              <span className="text-ink-900">Zéro commission.</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-600 md:text-xl">
              Publiez votre flotte, recevez des demandes qualifiées et gardez la relation client.
              Pour un abonnement fixe, dès 29 € HT par mois.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="#demarrer" size="lg" className="btn-glow">
                Commencer l&apos;essai gratuit <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/tarifs" variant="outline" size="lg">
                Voir les tarifs
              </ButtonLink>
            </div>
            <p className="text-sm text-ink-500">
              14 jours d&apos;essai · sans engagement · résiliable en un clic
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="glass rounded-card p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-ink-500">
                Plateformes à commission vs nous
              </p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-500">
                    <th className="pb-2 font-medium" />
                    <th className="pb-2 font-medium">Ailleurs</th>
                    <th className="pb-2 font-semibold text-brand-tint">Ici</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {COMPARE.map(([k, a, b]) => (
                    <tr key={k}>
                      <td className="py-3 pr-3 text-ink-600">{k}</td>
                      <td className="py-3 pr-3 text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <X className="size-3.5 text-ink-400" /> {a}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-ink-900">
                        <span className="inline-flex items-center gap-1">
                          <Check className="size-3.5 text-success" /> {b}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <SectionTitle
            eyebrow="Ce que vous gagnez"
            title="Tout ce qu'il faut pour louer plus. Rien qui vous freine."
          />
        </Reveal>
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 90}>
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

      <section id="demarrer" className="border-y border-ink-200/60 bg-surface/40">
        <div className="container-page py-20">
          <Reveal>
            <SectionTitle
              eyebrow="Démarrer"
              title="En ligne en quelques jours."
              text="Tout se fait dans l'application. Aucun rendez-vous, aucun dossier papier."
            />
          </Reveal>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <Reveal delay={i * 100}>
                  <div className="glass h-full rounded-card p-5">
                    <span className="text-3xl font-extrabold text-brand-tint">0{i + 1}</span>
                    <p className="mt-3 font-bold text-ink-900">{title}</p>
                    <p className="mt-1 text-sm text-ink-600">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal delay={200} className="mt-10">
            <div className="glass rounded-card p-8 text-center">
              <p className="text-2xl font-extrabold text-ink-900">
                Créez votre espace loueur dans l&apos;application
              </p>
              <p className="mx-auto mt-2 max-w-lg text-ink-600">
                Choisissez « Je loue mes véhicules » à l&apos;inscription. Votre essai gratuit
                démarre à la vérification.
              </p>
              <StoreBadges size="lg" className="mt-6 justify-center" />
            </div>
          </Reveal>
        </div>
      </section>

      <Faq items={FAQ} title="Questions des loueurs" />
    </>
  );
}
