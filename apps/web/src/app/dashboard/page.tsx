import Link from "next/link";
import { ArrowRight, Car, Eye, Inbox, Plus, TrendingUp } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { getPlan, vehicleLimitFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Lead, Vehicle } from "@/types/database";

export default async function DashboardHome() {
  const { agency } = await requirePro();

  if (!agency) {
    return (
      <EmptyState
        icon={<Car className="size-8" />}
        title="Commencez par creer votre agence"
        description="Nom, adresse, horaires et services : ces informations constituent votre fiche publique et vous positionnent sur la carte."
        action={<ButtonLink href="/dashboard/agence">Creer mon agence</ButtonLink>}
      />
    );
  }

  const supabase = await createClient();
  const [{ data: vehicles }, { data: leads }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("agency_id", agency.id),
    supabase
      .from("leads")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allVehicles = (vehicles as Vehicle[] | null) ?? [];
  const published = allVehicles.filter((v) => v.status === "published");
  const recentLeads = (leads as Lead[] | null) ?? [];
  const newLeads = recentLeads.filter((lead) => lead.status === "nouveau");

  const plan = getPlan(agency.plan);
  const limit = vehicleLimitFor(agency.plan);
  const totalViews = allVehicles.reduce((sum, v) => sum + v.view_count, 0) + agency.view_count;

  const stats = [
    {
      label: "Vehicules publies",
      value: limit === null ? `${published.length}` : `${published.length} / ${limit}`,
      icon: Car,
      href: "/dashboard/vehicules",
    },
    {
      label: "Demandes non traitees",
      value: `${newLeads.length}`,
      icon: Inbox,
      href: "/dashboard/demandes",
    },
    { label: "Vues cumulees", value: `${totalViews}`, icon: Eye },
    { label: "Palier", value: plan.name, icon: TrendingUp, href: "/dashboard/abonnement" },
  ];

  const quotaReached = limit !== null && published.length >= limit;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const content = (
            <CardContent className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className="size-3.5" /> {stat.label}
              </p>
              <p className="text-2xl font-semibold text-ink-900">{stat.value}</p>
            </CardContent>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-lift">{content}</Card>
            </Link>
          ) : (
            <Card key={stat.label}>{content}</Card>
          );
        })}
      </section>

      {quotaReached ? (
        <Card className="border-amber-brand/40 bg-amber-brand-soft/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink-900">
                Vous avez atteint la limite du palier {plan.name}.
              </p>
              <p className="text-sm text-muted-foreground">
                Passez au palier superieur pour publier davantage de vehicules.
              </p>
            </div>
            <ButtonLink href="/dashboard/abonnement" size="sm">
              Changer de palier <ArrowRight />
            </ButtonLink>
          </CardContent>
        </Card>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Dernieres demandes</h2>
          <Link
            href="/dashboard/demandes"
            className="text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            Tout voir
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <EmptyState
            title="Aucune demande pour le moment"
            description="Des qu'un particulier vous contactera depuis votre fiche, la demande apparaitra ici."
          />
        ) : (
          <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {lead.first_name} {lead.last_name ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.email}
                    {lead.phone ? ` · ${lead.phone}` : ""} · {formatDate(lead.created_at)}
                  </p>
                </div>
                <Badge variant={lead.status === "nouveau" ? "accent" : "neutral"}>
                  {lead.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Mes vehicules</h2>
          <ButtonLink href="/dashboard/vehicules/nouveau" size="sm" variant="outline">
            <Plus /> Ajouter
          </ButtonLink>
        </div>

        {allVehicles.length === 0 ? (
          <EmptyState
            title="Aucun vehicule enregistre"
            description="Ajoutez votre premier vehicule : marque, modele, prix et options. Il apparaitra sur la carte de votre ville."
            action={
              <ButtonLink href="/dashboard/vehicules/nouveau" size="sm">
                Ajouter un vehicule
              </ButtonLink>
            }
          />
        ) : (
          <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
            {allVehicles.slice(0, 5).map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/dashboard/vehicules/${vehicle.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface-muted"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.price_per_day} € / jour · {vehicle.view_count} vues
                  </p>
                </div>
                <Badge variant={vehicle.status === "published" ? "success" : "neutral"}>
                  {vehicle.status === "published" ? "En ligne" : "Brouillon"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
