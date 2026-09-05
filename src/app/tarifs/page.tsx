import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { PLANS, yearlySaving } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarifs pour les loueurs professionnels",
  description:
    "Referencez votre agence de location de voiture a partir de 0 €. Abonnement mensuel sans engagement, aucune commission sur vos locations.",
  alternates: { canonical: "/tarifs" },
};

const FAQ = [
  {
    q: "Prenez-vous une commission sur mes locations ?",
    a: "Jamais. Le contrat de location se fait directement entre vous et votre client. Notre seul revenu est l'abonnement mensuel, ce qui garantit que nos interets restent alignes : plus vous recevez de demandes, plus vous restez abonne.",
  },
  {
    q: "Puis-je changer de palier ou resilier ?",
    a: "Oui, a tout moment depuis votre tableau de bord. Un changement de palier prend effet immediatement, avec un ajustement au prorata. En cas de resiliation, vos fiches restent visibles jusqu'a la fin de la periode payee.",
  },
  {
    q: "Que se passe-t-il si je repasse au palier gratuit ?",
    a: "Vos vehicules ne sont pas supprimes : ceux qui depassent le quota du palier repassent simplement en brouillon. Vous les republiez d'un clic si vous remontez de palier.",
  },
  {
    q: "Comment recois-je les demandes de mes clients ?",
    a: "Chaque demande apparait dans votre tableau de bord avec les coordonnees du client, les dates souhaitees et le vehicule concerne. Vous rappelez ou repondez directement.",
  },
  {
    q: "Y a-t-il des frais d'installation ?",
    a: "Aucun. La creation du compte, la fiche agence et la geolocalisation sont incluses des le palier gratuit.",
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-14">
      <header className="mx-auto max-w-2xl space-y-4 text-center">
        <Badge variant="accent">Espace professionnel</Badge>
        <h1 className="text-4xl font-semibold text-ink-900">
          Un abonnement clair, jamais de commission
        </h1>
        <p className="text-ink-600">
          Vous payez pour la visibilite, pas pour vos locations. Commencez gratuitement, changez de
          palier quand votre flotte grandit.
        </p>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col",
              plan.highlighted && "border-ink-900 shadow-lift ring-1 ring-ink-900",
            )}
          >
            {plan.highlighted ? (
              <Badge variant="ink" className="absolute -top-3 left-1/2 -translate-x-1/2">
                Le plus choisi
              </Badge>
            ) : null}

            <CardContent className="flex flex-1 flex-col gap-6 p-6">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-ink-900">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>

              <div>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold text-ink-900">
                    {plan.monthlyPrice === 0 ? "0 €" : `${plan.monthlyPrice} €`}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mois HT</span>
                </p>
                {plan.yearlyPrice > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ou {plan.yearlyPrice} € / an — {yearlySaving(plan)} € economises
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Sans carte bancaire</p>
                )}
              </div>

              <ul className="flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
                {plan.limitations?.map((limitation) => (
                  <li key={limitation} className="flex items-start gap-2.5 text-sm text-ink-400">
                    <Minus className="mt-0.5 size-4 shrink-0" />
                    {limitation}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={`/inscription?profil=pro&plan=${plan.id}`}
                variant={plan.highlighted ? "primary" : "outline"}
                className="w-full"
              >
                {plan.monthlyPrice === 0 ? "Commencer gratuitement" : `Choisir ${plan.name}`}
              </ButtonLink>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Prix hors taxes, facturation mensuelle ou annuelle par carte bancaire via Stripe. Sans
        engagement de duree : resiliable a tout moment depuis votre tableau de bord.
      </p>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-semibold text-ink-900">Questions frequentes</h2>
        <div className="mt-8 divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium text-ink-900 marker:hidden">
                {item.q}
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
