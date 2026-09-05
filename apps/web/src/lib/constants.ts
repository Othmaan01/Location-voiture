import type { FuelType, TransmissionType, VehicleCategory } from "@/types/database";

export const VEHICLE_CATEGORIES: { value: VehicleCategory; label: string }[] = [
  { value: "citadine", label: "Citadine" },
  { value: "compacte", label: "Compacte" },
  { value: "berline", label: "Berline" },
  { value: "suv", label: "SUV / 4x4" },
  { value: "break", label: "Break" },
  { value: "monospace", label: "Monospace" },
  { value: "cabriolet", label: "Cabriolet" },
  { value: "coupe", label: "Coupe" },
  { value: "utilitaire", label: "Utilitaire" },
  { value: "minibus", label: "Minibus" },
  { value: "prestige", label: "Prestige" },
  { value: "sans_permis", label: "Sans permis" },
];

export const TRANSMISSIONS: { value: TransmissionType; label: string }[] = [
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" },
];

export const FUELS: { value: FuelType; label: string }[] = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "hybride_rechargeable", label: "Hybride rechargeable" },
  { value: "electrique", label: "Electrique" },
  { value: "gpl", label: "GPL" },
];

export const VEHICLE_OPTIONS: { value: string; label: string }[] = [
  { value: "clim", label: "Climatisation" },
  { value: "gps", label: "GPS" },
  { value: "bluetooth", label: "Bluetooth" },
  { value: "regulateur", label: "Regulateur de vitesse" },
  { value: "camera_recul", label: "Camera de recul" },
  { value: "siege_bebe", label: "Siege bebe" },
  { value: "attelage", label: "Attelage" },
  { value: "coffre_toit", label: "Coffre de toit" },
  { value: "pneus_hiver", label: "Pneus hiver" },
  { value: "carplay", label: "Apple CarPlay / Android Auto" },
];

export const AGENCY_SERVICES: { value: string; label: string }[] = [
  { value: "livraison", label: "Livraison du vehicule" },
  { value: "aeroport", label: "Prise en charge aeroport" },
  { value: "gare", label: "Prise en charge gare" },
  { value: "24_7", label: "Ouvert 24h/24" },
  { value: "sans_caution", label: "Sans caution" },
  { value: "jeune_conducteur", label: "Jeune conducteur accepte" },
  { value: "longue_duree", label: "Location longue duree" },
  { value: "utilitaire", label: "Utilitaires disponibles" },
  { value: "montagne", label: "Equipement montagne" },
  { value: "equipement_neige", label: "Pneus neige / chaines" },
  { value: "prestige", label: "Vehicules de prestige" },
];

export const SORT_OPTIONS = [
  { value: "pertinence", label: "Pertinence" },
  { value: "prix_asc", label: "Prix croissant" },
  { value: "prix_desc", label: "Prix decroissant" },
  { value: "distance", label: "Distance" },
  { value: "recent", label: "Plus recents" },
] as const;

export const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

const labelFrom = (list: { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value;

export const categoryLabel = (v: string) => labelFrom(VEHICLE_CATEGORIES, v);
export const transmissionLabel = (v: string) => labelFrom(TRANSMISSIONS, v);
export const fuelLabel = (v: string) => labelFrom(FUELS, v);
export const optionLabel = (v: string) => labelFrom(VEHICLE_OPTIONS, v);
export const serviceLabel = (v: string) => labelFrom(AGENCY_SERVICES, v);

/** Vue par defaut de la carte : France metropolitaine. */
export const FRANCE_CENTER: [number, number] = [2.4, 46.6];
export const FRANCE_ZOOM = 5;
export const CITY_ZOOM = 11;
