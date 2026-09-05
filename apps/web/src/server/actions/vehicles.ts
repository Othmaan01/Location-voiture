"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, vehicleSchema } from "@/lib/validators";
import type { ActionState } from "@/lib/action-state";

function readVehicleForm(formData: FormData) {
  const optional = (key: string) => {
    const value = formData.get(key);
    return value === null || value === "" ? undefined : value;
  };

  return {
    brand: formData.get("brand"),
    model: formData.get("model"),
    version: optional("version"),
    year: optional("year"),
    category: formData.get("category"),
    transmission: formData.get("transmission"),
    fuel: formData.get("fuel"),
    seats: formData.get("seats") ?? 5,
    doors: formData.get("doors") ?? 5,
    luggage: formData.get("luggage") ?? 2,
    pricePerDay: formData.get("pricePerDay"),
    pricePerWeek: optional("pricePerWeek"),
    pricePerMonth: optional("pricePerMonth"),
    depositAmount: optional("depositAmount"),
    mileageIncludedDay: optional("mileageIncludedDay"),
    extraKmPrice: optional("extraKmPrice"),
    options: formData.getAll("options").map(String),
    description: optional("description"),
    images: formData
      .getAll("images")
      .map(String)
      .filter((url) => url.trim().length > 0),
    status: formData.get("status") ?? "draft",
    isFeatured: formData.get("isFeatured") === "on",
  };
}

export async function saveVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = vehicleSchema.safeParse(readVehicleForm(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signales.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { agency } = await requirePro();
  if (!agency) {
    return { status: "error", message: "Creez d'abord votre agence dans l'onglet Agence." };
  }

  const input = parsed.data;
  const vehicleId = formData.get("vehicleId")?.toString() || null;

  const payload = {
    agency_id: agency.id,
    brand: input.brand,
    model: input.model,
    version: input.version ?? null,
    year: input.year ?? null,
    category: input.category,
    transmission: input.transmission,
    fuel: input.fuel,
    seats: input.seats,
    doors: input.doors,
    luggage: input.luggage,
    price_per_day: input.pricePerDay,
    price_per_week: input.pricePerWeek ?? null,
    price_per_month: input.pricePerMonth ?? null,
    deposit_amount: input.depositAmount ?? null,
    mileage_included_day: input.mileageIncludedDay ?? null,
    extra_km_price: input.extraKmPrice ?? null,
    options: input.options,
    description: input.description ?? null,
    images: input.images,
    status: input.status,
    is_featured: input.isFeatured,
  };

  const supabase = await createClient();
  const { error } = vehicleId
    ? await supabase.from("vehicles").update(payload).eq("id", vehicleId)
    : await supabase.from("vehicles").insert(payload);

  if (error) {
    // Le trigger de quota renvoie un message deja lisible pour l'utilisateur.
    return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard/vehicules");
  revalidatePath(`/agence/${agency.slug}`);
  redirect("/dashboard/vehicules?enregistre=1");
}

export async function deleteVehicle(formData: FormData) {
  const { agency } = await requirePro();
  const vehicleId = formData.get("vehicleId")?.toString();
  if (!agency || !vehicleId) return;

  const supabase = await createClient();
  await supabase.from("vehicles").delete().eq("id", vehicleId).eq("agency_id", agency.id);

  revalidatePath("/dashboard/vehicules");
  revalidatePath(`/agence/${agency.slug}`);
  redirect("/dashboard/vehicules?supprime=1");
}

export async function toggleVehicleStatus(formData: FormData) {
  const { agency } = await requirePro();
  const vehicleId = formData.get("vehicleId")?.toString();
  const nextStatus = formData.get("status")?.toString() === "published" ? "published" : "draft";
  if (!agency || !vehicleId) return;

  const supabase = await createClient();
  await supabase
    .from("vehicles")
    .update({ status: nextStatus })
    .eq("id", vehicleId)
    .eq("agency_id", agency.id);

  revalidatePath("/dashboard/vehicules");
  revalidatePath(`/agence/${agency.slug}`);
}
