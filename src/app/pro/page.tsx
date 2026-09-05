import type { Metadata } from "next";
import { BarChart3, Globe2, Inbox, MapPinned, ShieldCheck, Zap } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Referencer mon agence de location de voiture",
  description:
    "Rejoignez l'annuaire cartographie des loueurs. Fiche geolocalisee, vehicules avec prix et options, demandes de contact directes. Sans commission.",
  alternates: { canonical: "/pro" },
};

const BENEFITS = [
  {
    icon: MapPinned,
    title: "Visible sur la carte de votre ville",
    text: "Votre agence apparait a l'endroit exact ou vos clients cherchent, avec vos vehicules et vos tarifs.",
  },
  {
    icon: Globe2,
    title: "Une page optimisee pour Google",
    text: "Chaque ville a sa page dediee, chaque vehicule sa fiche indexee. Vous captez la recherche locale sans budget publicitaire.",
  },
  {
    icon: Inbox,
    title: "Les demandes arrivent chez vous",
    text: "Coordonnees du client, dates souhaitees, vehicule concerne : tout arrive dans votre tableau de bord.",
  },
  {
    icon: ShieldCheck,
    title: "Aucune commission",
    text: "Vous gardez 100 % du montant de vos locations. Notre revenu, c'est l'abonnement, rien d'autre.",
  },
  {
    icon: BarChart3,
    title: "Des chiffres pour decider",
    text: "Vues de vos fiches, demandes recues, vehicules les plus consultes : vous savez ce qui fonctionne.",
  },
  {
    icon: Zap,
    title: "En ligne en 10 minutes",
    text: "Creez votre compte, renseignez votre agence, ajoutez un vehicule. C'est publie.",
  },
];

export default function ProLandingPage() {
  return (
    <>
      <section className="hero-glow border-b border-ink-100">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="space-y-6">
            <Badge variant="accent">Espace professionnel</Badge>
            <h1 className="text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Vos voitures sont disponibles.
              <br />
              <span className="text-amber-brand-dark">Encore faut-il qu&apos;on les trouve.</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-600">
              RentMap referencie les loueurs de voitures ville par ville. Vous publiez votre flotte,
              les particuliers vous contactent en direct. Pas de commission, pas
              d&apos;intermediaire, pas d&apos;engagement.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inscription?profil=pro" size="lg">
                Creer mon compte pro
              </ButtonLink>
              <ButtonLink href="/tarifs" variant="outline" size="lg">
                Voir les tarifs
              </ButtonLink>
            </div>
            <p className="text-sm text-muted-foreground">
              Palier gratuit disponible. Aucune carte bancaire requise pour commencer.
            </p>
          </div>

          <Card className="bg-ink-900 text-white">
            <CardContent className="space-y-5 p-8">
              <p className="text-sm font-medium text-amber-brand">Ce que vous obtenez</p>
              <ul className="space-y-4">
                {[
                  ["Fiche agence", "Adresse, horaires, services, photos, avis clients."],
                  ["Fiches vehicules", "Prix jour / semaine / mois, options, caution, conditions."],
                  ["Demandes qualifiees", "Nom, telephone, e-mail, dates et vehicule souhaite."],
                  ["Tableau de bord", "Publiez, modifiez, suivez vos statistiques."],
                ].map(([title, text]) => (
                  <li key={title} className="border-l-2 border-amber-brand/50 pl-4">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-ink-300">{text}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-2xl font-semibold text-ink-900">Pourquoi rejoindre RentMap</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardContent className="space-y-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-800">
                  <benefit.icon className="size-5" />
                </span>
                <p className="font-semibold text-ink-900">{benefit.title}</p>
                <p className="text-sm text-muted-foreground">{benefit.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <Card>
          <CardContent className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-ink-900">Combien ca coute ?</h2>
              <p className="text-sm text-muted-foreground">
                Le tarif depend uniquement du nombre de vehicules que vous publiez. Rien
                d&apos;autre.
              </p>
              <ButtonLink href="/tarifs" variant="outline" size="sm">
                Detail des paliers
              </ButtonLink>
            </div>

            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-ink-100 p-4"
                >
                  <div>
                    <p className="font-medium text-ink-900">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.vehicleLimit === null
                        ? "Vehicules illimites"
                        : `Jusqu'a ${plan.vehicleLimit} vehicule${plan.vehicleLimit > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="text-xl font-semibold text-ink-900">
                      {plan.monthlyPrice === 0 ? "Gratuit" : `${plan.monthlyPrice} €`}
                    </span>
                    {plan.monthlyPrice > 0 ? (
                      <span className="block text-xs text-muted-foreground">/ mois HT</span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
