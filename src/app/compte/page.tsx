import type { Metadata } from "next";
import Link from "next/link";
import { Heart, LogOut, Mail, Search } from "lucide-react";

import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { formatDate } from "@/lib/utils";
import type { Lead, VehicleSearchResult } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireSession("/compte");
  const supabase = await createClient();

  const [{ data: favorites }, { data: leads }] = await Promise.all([
    supabase.from("favorites").select("vehicle_id").eq("client_id", session.userId),
    supabase
      .from("leads")
      .select("*")
      .eq("client_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const favoriteIds = ((favorites as { vehicle_id: string }[] | null) ?? []).map(
    (f) => f.vehicle_id,
  );

  let favoriteVehicles: VehicleSearchResult[] = [];
  if (favoriteIds.length > 0) {
    const { data } = await supabase.from("vehicle_search_view").select("*").in("id", favoriteIds);
    favoriteVehicles = ((data as VehicleSearchResult[] | null) ?? []).map((item) => ({
      ...item,
      distance_km: null,
      total_count: 0,
    }));
  }

  const myLeads = (leads as Lead[] | null) ?? [];

  return (
    <div className="container-page py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink-900">
            Bonjour {session.profile?.full_name?.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.email}</p>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut /> Se deconnecter
          </Button>
        </form>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-900">
          <Heart className="size-4.5" /> Mes favoris
        </h2>
        {favoriteVehicles.length === 0 ? (
          <EmptyState
            title="Aucun vehicule enregistre"
            description="Ajoutez des vehicules a vos favoris pour les retrouver ici."
            action={
              <ButtonLink href="/recherche" variant="outline" size="sm">
                <Search /> Explorer les vehicules
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-900">
          <Mail className="size-4.5" /> Mes demandes envoyees
        </h2>
        {myLeads.length === 0 ? (
          <EmptyState
            title="Aucune demande envoyee"
            description="Vos demandes de contact aupres des agences apparaitront ici."
          />
        ) : (
          <div className="space-y-3">
            {myLeads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      Demande du {formatDate(lead.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.desired_start
                        ? `Du ${formatDate(lead.desired_start)} au ${formatDate(lead.desired_end)}`
                        : "Sans dates precisees"}
                    </p>
                  </div>
                  {lead.vehicle_id ? (
                    <Link
                      href={`/vehicule/${lead.vehicle_id}`}
                      className="text-sm font-medium text-ink-900 underline underline-offset-4"
                    >
                      Voir le vehicule
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
