/**
 * Referentiel des marques et modeles (retour fondateur, 2026-09-09) : tout le monde ecrit
 * « Renault », jamais « REnaUlt ». L'app suggere, le moteur normalise. Liste volontairement
 * courte et francaise ; une marque absente reste acceptee, mise en forme proprement.
 */
export interface VehicleBrand {
  name: string;
  models: readonly string[];
}

export const VEHICLE_BRANDS: readonly VehicleBrand[] = [
  { name: "Abarth", models: ["500", "595", "695"] },
  { name: "Alfa Romeo", models: ["Giulia", "Stelvio", "Tonale", "Giulietta"] },
  { name: "Alpine", models: ["A110", "A290"] },
  { name: "Aston Martin", models: ["DB12", "Vantage", "DBX"] },
  {
    name: "Audi",
    models: ["A1", "A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q7", "Q8", "RS3", "RS6", "e-tron"],
  },
  { name: "Bentley", models: ["Continental GT", "Bentayga", "Flying Spur"] },
  {
    name: "BMW",
    models: [
      "Série 1",
      "Série 2",
      "Série 3",
      "Série 4",
      "Série 5",
      "X1",
      "X3",
      "X5",
      "M3",
      "M4",
      "i4",
      "iX",
    ],
  },
  { name: "BYD", models: ["Dolphin", "Seal", "Atto 3"] },
  {
    name: "Citroën",
    models: ["C3", "C3 Aircross", "C4", "C5 Aircross", "Berlingo", "Jumpy", "Jumper", "Ami"],
  },
  { name: "Cupra", models: ["Formentor", "Leon", "Born", "Ateca"] },
  { name: "Dacia", models: ["Sandero", "Duster", "Jogger", "Spring", "Logan"] },
  { name: "DS", models: ["DS 3", "DS 4", "DS 7", "DS 9"] },
  { name: "Ferrari", models: ["Roma", "296 GTB", "SF90", "Purosangue", "F8 Tributo"] },
  { name: "Fiat", models: ["500", "500X", "Panda", "Tipo", "Doblò", "Ducato"] },
  {
    name: "Ford",
    models: ["Fiesta", "Focus", "Puma", "Kuga", "Mustang", "Transit", "Transit Custom", "Ranger"],
  },
  { name: "Honda", models: ["Jazz", "Civic", "HR-V", "CR-V", "ZR-V"] },
  {
    name: "Hyundai",
    models: ["i10", "i20", "i30", "Kona", "Tucson", "Santa Fe", "Ioniq 5", "Ioniq 6"],
  },
  { name: "Jaguar", models: ["F-Pace", "E-Pace", "F-Type", "XE", "XF"] },
  { name: "Jeep", models: ["Renegade", "Compass", "Avenger", "Wrangler", "Grand Cherokee"] },
  { name: "Kia", models: ["Picanto", "Rio", "Ceed", "Niro", "Sportage", "Sorento", "EV6", "EV3"] },
  { name: "Lamborghini", models: ["Urus", "Huracán", "Revuelto"] },
  {
    name: "Land Rover",
    models: [
      "Defender",
      "Discovery",
      "Discovery Sport",
      "Range Rover",
      "Range Rover Sport",
      "Range Rover Evoque",
      "Range Rover Velar",
    ],
  },
  { name: "Lexus", models: ["UX", "NX", "RX", "ES", "LBX"] },
  { name: "Maserati", models: ["Grecale", "Levante", "Ghibli", "MC20", "GranTurismo"] },
  { name: "Mazda", models: ["Mazda2", "Mazda3", "CX-30", "CX-5", "CX-60", "MX-5"] },
  { name: "McLaren", models: ["720S", "750S", "Artura", "GT"] },
  {
    name: "Mercedes-Benz",
    models: [
      "Classe A",
      "Classe B",
      "Classe C",
      "Classe E",
      "Classe S",
      "CLA",
      "GLA",
      "GLB",
      "GLC",
      "GLE",
      "GLS",
      "Classe G",
      "Classe V",
      "Vito",
      "Sprinter",
      "EQA",
      "EQB",
      "EQE",
    ],
  },
  { name: "Mercedes-AMG", models: ["A 45", "C 63", "G 63", "GLE 63", "GT"] },
  { name: "MG", models: ["MG4", "MG5", "ZS", "HS"] },
  { name: "Mini", models: ["Cooper", "Countryman", "Clubman", "Aceman"] },
  { name: "Nissan", models: ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya"] },
  {
    name: "Opel",
    models: ["Corsa", "Astra", "Mokka", "Crossland", "Grandland", "Vivaro", "Movano"],
  },
  {
    name: "Peugeot",
    models: [
      "108",
      "208",
      "308",
      "408",
      "508",
      "2008",
      "3008",
      "5008",
      "Rifter",
      "Partner",
      "Expert",
      "Boxer",
    ],
  },
  {
    name: "Porsche",
    models: ["911", "718 Cayman", "718 Boxster", "Macan", "Cayenne", "Panamera", "Taycan"],
  },
  {
    name: "Renault",
    models: [
      "Twingo",
      "Clio",
      "Clio V",
      "Captur",
      "Mégane",
      "Mégane E-Tech",
      "Arkana",
      "Austral",
      "Espace",
      "Rafale",
      "Scénic",
      "Kangoo",
      "Trafic",
      "Master",
      "Zoe",
      "5 E-Tech",
    ],
  },
  { name: "Rolls-Royce", models: ["Ghost", "Cullinan", "Phantom", "Spectre"] },
  { name: "Seat", models: ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco"] },
  { name: "Škoda", models: ["Fabia", "Scala", "Octavia", "Kamiq", "Karoq", "Kodiaq", "Enyaq"] },
  { name: "Smart", models: ["Fortwo", "Forfour", "#1", "#3"] },
  { name: "Suzuki", models: ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny"] },
  { name: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X"] },
  {
    name: "Toyota",
    models: ["Aygo X", "Yaris", "Yaris Cross", "Corolla", "C-HR", "RAV4", "Proace", "Land Cruiser"],
  },
  {
    name: "Volkswagen",
    models: [
      "Polo",
      "Golf",
      "T-Roc",
      "T-Cross",
      "Tiguan",
      "Touran",
      "Passat",
      "Taigo",
      "ID.3",
      "ID.4",
      "ID.5",
      "Caddy",
      "Transporter",
      "Crafter",
    ],
  },
  { name: "Volvo", models: ["XC40", "XC60", "XC90", "V60", "S60", "EX30", "EX90"] },
];

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const squeeze = (s: string) => s.replace(/\s+/g, " ").trim();
/** Mise en forme d'un libelle inconnu : sigles courts conserves (BMW, DFSK), sinon initiale en capitale. */
const titleCase = (s: string) =>
  squeeze(s)
    .split(" ")
    .map((w) =>
      w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");

export function findBrand(input: string): VehicleBrand | undefined {
  const key = fold(input);
  if (!key) return undefined;
  return VEHICLE_BRANDS.find((b) => fold(b.name) === key);
}

/** « REnaUlt » → « Renault » ; marque inconnue → mise en forme propre, jamais rejetee. */
export function normalizeBrand(input: string): string {
  return findBrand(input)?.name ?? titleCase(input);
}

export function normalizeModel(brand: string, input: string): string {
  const key = fold(input);
  if (!key) return squeeze(input);
  const known = findBrand(brand)?.models.find((m) => fold(m) === key);
  return known ?? squeeze(input).charAt(0).toUpperCase() + squeeze(input).slice(1);
}

export function suggestBrands(query: string, limit = 6): string[] {
  const key = fold(query);
  if (!key) return [];
  const starts = VEHICLE_BRANDS.filter((b) => fold(b.name).startsWith(key)).map((b) => b.name);
  const contains = VEHICLE_BRANDS.filter(
    (b) => !fold(b.name).startsWith(key) && fold(b.name).includes(key),
  ).map((b) => b.name);
  return [...starts, ...contains].slice(0, limit);
}

export function suggestModels(brand: string, query: string, limit = 8): string[] {
  const models = findBrand(brand)?.models ?? [];
  const key = fold(query);
  if (!key) return models.slice(0, limit);
  const starts = models.filter((m) => fold(m).startsWith(key));
  const contains = models.filter((m) => !fold(m).startsWith(key) && fold(m).includes(key));
  return [...starts, ...contains].slice(0, limit);
}
