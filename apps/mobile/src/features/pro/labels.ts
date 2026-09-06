import type { SelectOption } from "@/components/ui/Select";

export const CATEGORY_OPTIONS: readonly SelectOption<
  | "citadine"
  | "compacte"
  | "berline"
  | "suv"
  | "break"
  | "monospace"
  | "cabriolet"
  | "coupe"
  | "utilitaire"
  | "minibus"
  | "prestige"
  | "sans_permis"
>[] = [
  { value: "citadine", label: "Citadine" },
  { value: "compacte", label: "Compacte" },
  { value: "berline", label: "Berline" },
  { value: "suv", label: "SUV" },
  { value: "break", label: "Break" },
  { value: "monospace", label: "Monospace" },
  { value: "cabriolet", label: "Cabriolet" },
  { value: "coupe", label: "Coupé" },
  { value: "utilitaire", label: "Utilitaire" },
  { value: "minibus", label: "Minibus" },
  { value: "prestige", label: "Prestige" },
  { value: "sans_permis", label: "Sans permis" },
];
/**
 * Categories masquees dans l'app (decision fondateur 2026-09-06 : voitures uniquement au lancement).
 * Le moteur les connait toujours : les rouvrir = retirer une entree ici.
 */
export const HIDDEN_CATEGORIES: ReadonlySet<string> = new Set(["utilitaire", "minibus"]);
export const ENABLED_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter(
  (o) => !HIDDEN_CATEGORIES.has(o.value),
);
export const TRANSMISSION_OPTIONS: readonly SelectOption<"manuelle" | "automatique">[] = [
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" },
];
export const FUEL_OPTIONS: readonly SelectOption<
  "essence" | "diesel" | "hybride" | "hybride_rechargeable" | "electrique" | "gpl"
>[] = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "hybride_rechargeable", label: "Hybride rechargeable" },
  { value: "electrique", label: "Électrique" },
  { value: "gpl", label: "GPL" },
];
export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;
export const TRANSMISSION_LABEL = Object.fromEntries(
  TRANSMISSION_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;
export const FUEL_LABEL = Object.fromEntries(FUEL_OPTIONS.map((o) => [o.value, o.label])) as Record<
  string,
  string
>;

export const BLOCKER_LABEL: Record<string, string> = {
  organization_not_verified: "Organisation pas encore vérifiée",
  agency_incomplete: "Adresse et position de l'agence à compléter",
  no_photo: "Ajoutez au moins une photo",
  no_rate_plan: "Définissez un tarif",
  quota_reached: "Quota de votre offre atteint",
  subscription_required: "Abonnement résilié ou impayé : réactivez-le",
};

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  kbis: "Kbis ou extrait d'immatriculation",
  insurance: "Attestation d'assurance flotte",
  id_card: "Pièce d'identité du dirigeant",
  driving_license: "Permis de conduire",
  vehicle_registration: "Carte grise",
  other: "Autre document",
};

export const ORG_STATUS: Record<
  string,
  { label: string; tone: "accent" | "success" | "warning" | "neutral" }
> = {
  draft: { label: "Dossier à compléter", tone: "neutral" },
  submitted: { label: "Vérification demandée", tone: "warning" },
  under_review: { label: "En cours de vérification", tone: "warning" },
  verified: { label: "Vérifié", tone: "success" },
  rejected: { label: "Refusé", tone: "accent" },
  suspended: { label: "Suspendu", tone: "accent" },
};

export const formatEuros = (cents: number) =>
  `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })} €`;
