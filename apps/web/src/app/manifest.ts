import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

/**
 * Manifeste d'application web.
 *
 * Le trafic etant majoritairement mobile, le site doit pouvoir etre epingle
 * sur l'ecran d'accueil et s'ouvrir sans la barre du navigateur.
 * A completer par des icones PNG 192 et 512 px pour l'installation iOS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${publicEnv.siteName} - Location de voiture pres de chez vous`,
    short_name: publicEnv.siteName,
    description:
      "Des agences de location vérifiées près de chez vous. Contact direct, sans commission.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0e0e11",
    theme_color: "#0e0e11",
    categories: ["travel", "shopping", "navigation"],
    icons: [
      { src: "/icon-512.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Rechercher un véhicule", url: "/recherche" },
      { name: "Toutes les villes", url: "/villes" },
    ],
  };
}
