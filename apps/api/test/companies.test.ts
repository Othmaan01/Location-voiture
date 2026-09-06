import { describe, expect, it } from "vitest";

import { createCompaniesService, mapCompany } from "../src/modules/companies/service.js";

const danone = {
  results: [
    {
      siren: "552032534",
      nom_complet: "DANONE",
      nom_raison_sociale: "DANONE",
      etat_administratif: "A",
      siege: {
        siret: "55203253400703",
        adresse: "59-61 RUE LA FAYETTE 75009 PARIS",
        numero_voie: "59",
        type_voie: "RUE",
        libelle_voie: "LA FAYETTE",
        code_postal: "75009",
        libelle_commune: "PARIS",
        latitude: "48.8763540066087",
        longitude: "2.34353640229216",
        etat_administratif: "A",
        est_siege: true,
      },
      matching_etablissements: [],
    },
  ],
};

describe("annuaire des entreprises", () => {
  it("mappe un SIREN : raison sociale, siege, coordonnees numeriques", () => {
    const company = mapCompany(danone, "552032534");
    expect(company).toMatchObject({
      siren: "552032534",
      legalName: "DANONE",
      active: true,
      headOffice: {
        siret: "55203253400703",
        addressLine: "59 RUE LA FAYETTE",
        postalCode: "75009",
        cityName: "PARIS",
        latitude: 48.8763540066087,
        isHeadOffice: true,
      },
    });
    expect(company?.establishments.map((e) => e.siret)).toEqual(["55203253400703"]);
  });

  it("un SIRET demande ne renvoie que cet etablissement ; un resultat d'une autre entreprise est ignore", () => {
    const bySiret = mapCompany(danone, "55203253400703");
    expect(bySiret?.establishments).toHaveLength(1);
    expect(mapCompany(danone, "443061841")).toBeNull();
    expect(mapCompany({ results: [] }, "443061841")).toBeNull();
  });

  it("met en cache, renvoie 404 sur inconnu et 503 quand l'annuaire ne repond pas", async () => {
    let calls = 0;
    const fetchImpl = (async (url: string | URL | Request) => {
      calls += 1;
      const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      const q = new URL(href).searchParams.get("q");
      if (q === "000000000") return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (q === "111111111") return new Response("boom", { status: 502 });
      return new Response(JSON.stringify(danone), { status: 200 });
    }) as typeof fetch;
    const service = createCompaniesService(fetchImpl);
    await service.lookup("552032534");
    await service.lookup("552032534");
    expect(calls).toBe(1);
    await expect(service.lookup("000000000")).rejects.toMatchObject({ code: "not_found" });
    await expect(service.lookup("111111111")).rejects.toMatchObject({ code: "unavailable" });
  });
});
