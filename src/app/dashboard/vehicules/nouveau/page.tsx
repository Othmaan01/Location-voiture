import { VehicleForm } from "@/components/dashboard/vehicle-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { canPublishMore } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export default async function NewVehiclePage() {
  const { agency } = await requirePro();

  if (!agency) {
    return (
      <EmptyState
        title="Creez d'abord votre agence"
        description="Un vehicule doit etre rattache a une agence."
        action={<ButtonLink href="/dashboard/agence">Creer mon agence</ButtonLink>}
      />
    );
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agency.id)
    .eq("status", "published");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink-900">Ajouter un vehicule</h2>
      <VehicleForm plan={agency.plan} canPublish={canPublishMore(agency.plan, count ?? 0)} />
    </div>
  );
}
