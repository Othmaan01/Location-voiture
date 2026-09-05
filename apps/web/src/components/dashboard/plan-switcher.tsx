"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, Minus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/types/database";

export function PlanSwitcher({
  currentPlan,
  hasSubscription,
  stripeEnabled,
}: {
  currentPlan: PlanTier;
  hasSubscription: boolean;
  stripeEnabled: boolean;
}) {
  const [loading, setLoading] = useState<PlanTier | "portal" | null>(null);

  async function startCheckout(plan: PlanTier) {
    setLoading(plan);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        toast.error(payload.error ?? "Impossible d'ouvrir le paiement.");
        return;
      }
      window.location.href = payload.url;
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        toast.error(payload.error ?? "Impossible d'ouvrir le portail de facturation.");
        return;
      }
      window.location.href = payload.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card
              key={plan.id}
              className={cn("flex flex-col", isCurrent && "border-ink-900 ring-1 ring-ink-900")}
            >
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                  {isCurrent ? <Badge variant="ink">Actuel</Badge> : null}
                </div>

                <p className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-ink-900">
                    {plan.monthlyPrice === 0 ? "0 €" : `${plan.monthlyPrice} €`}
                  </span>
                  <span className="text-xs text-muted-foreground">/ mois HT</span>
                </p>

                <ul className="flex-1 space-y-1.5">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-ink-600">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations?.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-xs text-ink-400">
                      <Minus className="mt-0.5 size-3.5 shrink-0" />
                      {limitation}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="subtle" disabled className="w-full">
                    Palier actuel
                  </Button>
                ) : plan.id === "free" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={openPortal}
                    disabled={!stripeEnabled || !hasSubscription || loading !== null}
                  >
                    Retrograder
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => startCheckout(plan.id)}
                    disabled={!stripeEnabled || loading !== null}
                  >
                    {loading === plan.id ? <Loader2 className="animate-spin" /> : null}
                    Passer au palier {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasSubscription ? (
        <Button variant="outline" onClick={openPortal} disabled={loading !== null}>
          {loading === "portal" ? <Loader2 className="animate-spin" /> : <ExternalLink />}
          Gerer ma facturation et mes factures
        </Button>
      ) : null}
    </div>
  );
}
