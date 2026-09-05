"use server";

import { revalidatePath } from "next/cache";

import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { agencySchema, fieldErrors } from "@/lib/validators";
import type { ActionState } from "@/lib/action-state";

function readAgencyForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    website: formData.get("website") || undefined,
    addressLine: formData.get("addressLine") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    cityId: formData.get("cityId") || "",
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    services: formData.getAll("services").map(String),
  };
}

/** Cree ou met a jour l'agence du professionnel connecte. */
export async function saveAgency(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = agencySchema.safeParse(readAgencyForm(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signales.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { session, agency } = await requirePro();
  const supabase = await createClient();
  const input = parsed.data;

  // On resout la ville pour recopier son nom et ses coordonnees si besoin.
  let cityName: string | null = null;
  let latitude = input.latitude ?? null;
  let longitude = input.longitude ?? null;

  if (input.cityId) {
    const { data: city } = await supabase
      .from("cities")
      .select("name, latitude, longitude")
      .eq("id", input.cityId)
      .maybeSingle();
    if (city) {
      cityName = (city as { name: string }).name;
      latitude ??= (city as { latitude: number }).latitude;
      longitude ??= (city as { longitude: number }).longitude;
    }
  }

  const payload = {
    name: input.name,
    description: input.description ?? null,
    email: input.email || null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    address_line: input.addressLine ?? null,
    postal_code: input.postalCode ?? null,
    city_id: input.cityId || null,
    city_name: cityName,
    latitude,
    longitude,
    services: input.services,
  };

  if (agency) {
    const { error } = await supabase.from("agencies").update(payload).eq("id", agency.id);
    if (error) return { status: "error", message: error.message };
  } else {
    const base = slugify(input.name) || "agence";
    const { error } = await supabase.from("agencies").insert({
      ...payload,
      owner_id: session.userId,
      slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
      status: "draft",
    });
    if (error) return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { status: "success", message: "Agence enregistree." };
}

/** Publie ou depublie la fiche agence. */
export async function setAgencyStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { agency } = await requirePro();
  if (!agency) return { status: "error", message: "Creez d'abord votre agence." };

  const nextStatus = formData.get("status") === "published" ? "published" : "draft";

  if (nextStatus === "published") {
    const missing: string[] = [];
    if (!agency.city_id) missing.push("la ville");
    if (!agency.latitude || !agency.longitude) missing.push("la position sur la carte");
    if (!agency.phone && !agency.email) missing.push("un moyen de contact");
    if (missing.length > 0) {
      return {
        status: "error",
        message: `Completez ${missing.join(", ")} avant de publier votre fiche.`,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agencies")
    .update({ status: nextStatus })
    .eq("id", agency.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/villes");
  return {
    status: "success",
    message:
      nextStatus === "published" ? "Votre fiche est en ligne." : "Votre fiche est hors ligne.",
  };
}

/** Change le statut d'une demande de contact. */
export async function setLeadStatus(formData: FormData) {
  const { agency } = await requirePro();
  const leadId = formData.get("leadId")?.toString();
  const status = formData.get("status")?.toString();
  const allowed = ["nouveau", "contacte", "converti", "perdu"];

  if (!agency || !leadId || !status || !allowed.includes(status)) return;

  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", leadId).eq("agency_id", agency.id);
  revalidatePath("/dashboard/demandes");
}
