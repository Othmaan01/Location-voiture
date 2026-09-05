"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { fieldErrors, leadSchema } from "@/lib/validators";
import type { ActionState } from "@/lib/action-state";

/** Envoi d'une demande de contact a une agence (formulaire public). */
export async function submitLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse({
    agencyId: formData.get("agencyId"),
    vehicleId: formData.get("vehicleId") || undefined,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message") || undefined,
    desiredStart: formData.get("desiredStart") || undefined,
    desiredEnd: formData.get("desiredEnd") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signales.",
      errors: fieldErrors(parsed.error),
    };
  }

  // Piege a robots : un champ cache que seul un bot remplit.
  if (formData.get("website")) {
    return { status: "success", message: "Votre demande a bien ete envoyee." };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("leads").insert({
    agency_id: input.agencyId,
    vehicle_id: input.vehicleId ?? null,
    client_id: user?.id ?? null,
    first_name: input.firstName,
    last_name: input.lastName ?? null,
    email: input.email,
    phone: input.phone ?? null,
    message: input.message ?? null,
    desired_start: input.desiredStart ?? null,
    desired_end: input.desiredEnd ?? null,
    source: input.vehicleId ? "fiche_vehicule" : "fiche_agence",
  });

  if (error) {
    console.error("[submitLead]", error.message);
    return {
      status: "error",
      message: "Impossible d'envoyer la demande pour le moment. Reessayez dans un instant.",
    };
  }

  revalidatePath("/dashboard/demandes");

  return {
    status: "success",
    message: "Demande envoyee. L'agence vous repondra directement par e-mail ou telephone.",
  };
}
