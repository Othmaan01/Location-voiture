import { Eye, EyeOff, Pencil, Plus } from "lucide-react";

import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { canPublishMore, getPlan, vehicleLimitFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { toggleVehicleStatus } from "@/server/actions/vehicles";
import { formatPrice } from "@/lib/utils";
import type { Vehicle } from "@/types/database";

export default async function VehiclesPage() {
  const { agency } = await requirePro();

  if (!agency) {
    return (
      <EmptyState
        title="Creez d'abord votre agence"
        description="Les vehicules sont rattaches a une agence."
        action={<ButtonLink href="/dashboard/agence">Creer mon agence</ButtonLink>}
      />
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  const vehicles = (data as Vehicle[] | null) ?? [];
  const published = vehicles.filter((v) => v.status === "published").length;
  const limit = vehicleLimitFor(agency.plan);
  const plan = getPlan(agency.plan);
  const canAdd = canPublishMore(agency.plan, published);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Mes vehicules</h2>
          <p className="text-sm text-muted-foreground">
            {published} publie{published > 1 ? "s" : ""}
            {limit !== null
              ? ` sur ${limit} autorises (palier ${plan.name})`
              : " — palier illimite"}
          </p>
        </div>
        <ButtonLink href="/dashboard/vehicules/nouveau" size="sm">
          <Plus /> Ajouter un vehicule
        </ButtonLink>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          title="Aucun vehicule enregistre"
          description="Ajoutez votre premier vehicule pour apparaitre dans les resultats de recherche."
          action={
            <ButtonLink href="/dashboard/vehicules/nouveau" size="sm">
              Ajouter un vehicule
            </ButtonLink>
          }
        />
      ) : (
        <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="flex flex-wrap items-center gap-4 p-4">
              <VehicleImage
                src={vehicle.images?.[0]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="aspect-[4/3] w-24 shrink-0 rounded-xl"
                sizes="100px"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">
                  {vehicle.brand} {vehicle.model}
                  {vehicle.version ? (
                    <span className="text-ink-400"> {vehicle.version}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabel(vehicle.category)} · {formatPrice(vehicle.price_per_day)} / jour ·{" "}
                  {vehicle.view_count} vues
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={vehicle.status === "published" ? "success" : "neutral"}>
                    {vehicle.status === "published"
                      ? "En ligne"
                      : vehicle.status === "draft"
                        ? "Brouillon"
                        : "Archive"}
                  </Badge>
                  {vehicle.is_featured ? <Badge variant="accent">Mis en avant</Badge> : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <form action={toggleVehicleStatus}>
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={vehicle.status === "published" ? "draft" : "published"}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    disabled={vehicle.status !== "published" && !canAdd}
                    title={
                      vehicle.status !== "published" && !canAdd
                        ? "Quota atteint pour votre palier"
                        : undefined
                    }
                  >
                    {vehicle.status === "published" ? <EyeOff /> : <Eye />}
                    {vehicle.status === "published" ? "Retirer" : "Publier"}
                  </Button>
                </form>

                <ButtonLink href={`/dashboard/vehicules/${vehicle.id}`} variant="subtle" size="sm">
                  <Pencil /> Modifier
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
