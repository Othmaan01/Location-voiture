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
      "Trouvez un loueur de voitures pres de chez vous : carte interactive, prix, options et contact direct avec les agences.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fdfcfa",
    theme_color: "#141b2b",
    categories: ["travel", "shopping", "navigation"],
    icons: [
      { src: "/icon-512.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Rechercher un vehicule", url: "/recherche" },
      { name: "Toutes les villes", url: "/villes" },
    ],
  };
}
