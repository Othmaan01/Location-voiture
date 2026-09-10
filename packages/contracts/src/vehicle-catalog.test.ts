import { describe, expect, it } from "vitest";

import {
  VEHICLE_BRANDS,
  normalizeBrand,
  normalizeModel,
  suggestBrands,
  suggestModels,
} from "./vehicle-catalog.js";

describe("referentiel marques", () => {
  it("normalise la casse et les accents des marques connues", () => {
    expect(normalizeBrand("REnaUlt")).toBe("Renault");
    expect(normalizeBrand(" mercedes benz ")).toBe("Mercedes-Benz");
    expect(normalizeBrand("skoda")).toBe("Škoda");
    expect(normalizeBrand("bmw")).toBe("BMW");
  });
  it("met en forme une marque inconnue sans la rejeter", () => {
    expect(normalizeBrand("lynk  & co")).toBe("Lynk & Co");
    expect(normalizeBrand("DFSK")).toBe("DFSK");
  });
  it("normalise le modele selon la marque", () => {
    expect(normalizeModel("Renault", "clio v")).toBe("Clio V");
    expect(normalizeModel("Renault", "megane")).toBe("Mégane");
    expect(normalizeModel("Peugeot", "e-208 gt")).toBe("e-208 Gt");
    expect(normalizeModel("Peugeot", "3008 hybrid")).toBe("3008 Hybrid");
  });
  it("suggere par prefixe puis par inclusion", () => {
    expect(suggestBrands("merc")).toEqual(["Mercedes-AMG", "Mercedes-Benz"]);
    expect(suggestBrands("me").slice(0, 2)).toEqual(["Mercedes-AMG", "Mercedes-Benz"]);
    expect(suggestBrands("rover")).toEqual(["Land Rover"]);
    expect(suggestModels("Volkswagen", "t").slice(0, 6)).toEqual([
      "T-Cross",
      "T-Roc",
      "Taigo",
      "Tayron",
      "Tiguan",
      "Touareg",
    ]);
    expect(suggestModels("Inconnue", "x")).toEqual([]);
  });

  it("ne contient aucun doublon et reste trie par marque", () => {
    const names = VEHICLE_BRANDS.map((b) => b.name);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    expect([...names].sort((a, b) => a.localeCompare(b, "fr"))).toEqual(names);
    for (const brand of VEHICLE_BRANDS) {
      const models = brand.models.map((m) => m.toLowerCase());
      expect(new Set(models).size, brand.name).toBe(models.length);
    }
    expect(VEHICLE_BRANDS.length).toBeGreaterThan(70);
  });
});
