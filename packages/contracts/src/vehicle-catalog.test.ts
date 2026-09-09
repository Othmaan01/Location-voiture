import { describe, expect, it } from "vitest";

import { normalizeBrand, normalizeModel, suggestBrands, suggestModels } from "./vehicle-catalog.js";

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
    expect(normalizeModel("Peugeot", "e-208 gt")).toBe("E-208 gt");
  });
  it("suggere par prefixe puis par inclusion", () => {
    expect(suggestBrands("merc")).toEqual(["Mercedes-Benz", "Mercedes-AMG"]);
    expect(suggestBrands("me").slice(0, 2)).toEqual(["Mercedes-Benz", "Mercedes-AMG"]);
    expect(suggestBrands("rover")).toEqual(["Land Rover"]);
    expect(suggestModels("Volkswagen", "t").slice(0, 6)).toEqual([
      "T-Roc",
      "T-Cross",
      "Tiguan",
      "Touran",
      "Taigo",
      "Transporter",
    ]);
    expect(suggestModels("Inconnue", "x")).toEqual([]);
  });
});
