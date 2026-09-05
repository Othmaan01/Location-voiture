import { notFound } from "next/navigation";

import { VehicleForm } from "@/components/dashboard/vehicle-form";
import { requirePro } from "@/lib/auth";
import { canPublishMore } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Vehicle } from "@/types/database";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { agency } = await requirePro();
  if (!agency) notFound();

  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).eq("agency_id", agency.id).maybeSingle(),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id)
      .eq("status", "published"),
  ]);

  const vehicle = data as Vehicle | null;
  if (!vehicle) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink-900">
        Modifier {vehicle.brand} {vehicle.model}
      </h2>
      <VehicleForm
        vehicle={vehicle}
        plan={agency.plan}
        canPublish={canPublishMore(agency.plan, count ?? 0)}
      />
    </div>
  );
}
