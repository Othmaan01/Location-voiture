import { AlertTriangle, Check } from "lucide-react";

import { PlanSwitcher } from "@/components/dashboard/plan-switcher";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requirePro } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/env";
import { getPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Subscription } from "@/types/database";

export default async function SubscriptionPage() {
  const { agency } = await requirePro();

  if (!agency) {
    return (
      <EmptyState
        title="Creez d'abord votre agence"
        description="L'abonnement est rattache a une agence."
        action={<ButtonLink href="/dashboard/agence">Creer mon agence</ButtonLink>}
      />
    );
  }

  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("agency_id", agency.id).maybeSingle(),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id)
      .eq("status", "published"),
  ]);

  const subscription = data as Subscription | null;
  const plan = getPlan(agency.plan);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Abonnement</h2>
        <p className="text-sm text-muted-foreground">
          Vous payez pour la visibilite de votre flotte. Aucune commission n&apos;est prelevee sur
          vos locations.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-ink-900">Palier {plan.name}</p>
              {subscription ? (
                <Badge
                  variant={
                    subscription.status === "active" || subscription.status === "trialing"
                      ? "success"
                      : "danger"
                  }
                >
                  {subscription.status}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {count ?? 0} vehicule{(count ?? 0) > 1 ? "s" : ""} publie
              {(count ?? 0) > 1 ? "s" : ""}
              {plan.vehicleLimit !== null ? ` sur ${plan.vehicleLimit}` : " (illimite)"}
            </p>
            {subscription?.current_period_end ? (
              <p className="text-xs text-muted-foreground">
                {subscription.cancel_at_period_end
                  ? `Resiliation effective le ${formatDate(subscription.current_period_end)}`
                  : `Prochain renouvellement le ${formatDate(subscription.current_period_end)}`}
              </p>
            ) : null}
          </div>

          <p className="text-right">
            <span className="text-3xl font-semibold text-ink-900">
              {plan.monthlyPrice === 0 ? "0 €" : `${plan.monthlyPrice} €`}
            </span>
            <span className="block text-xs text-muted-foreground">/ mois HT</span>
          </p>
        </CardContent>
      </Card>

      {!isStripeConfigured ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium text-ink-900">Stripe n&apos;est pas encore branche.</p>
              <p className="text-muted-foreground">
                Renseignez STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER et
                STRIPE_PRICE_PRO dans votre environnement pour activer le paiement. Les paliers
                restent modifiables manuellement en base en attendant.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PlanSwitcher
        currentPlan={agency.plan}
        hasSubscription={Boolean(subscription?.stripe_customer_id)}
        stripeEnabled={isStripeConfigured}
      />

      <Card>
        <CardContent className="space-y-3">
          <p className="font-medium text-ink-900">Inclus dans votre palier</p>
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-700">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
