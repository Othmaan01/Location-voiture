import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { publicEnv } from "@/lib/env";

import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${publicEnv.siteName} - Tous les loueurs de voitures, ville par ville`,
    template: `%s | ${publicEnv.siteName}`,
  },
  description:
    "Trouvez un loueur de voitures pres de chez vous : carte interactive, prix, options et contact direct avec les agences. Sans commission sur la location.",
  keywords: [
    "location de voiture",
    "loueur de voiture",
    "agence de location",
    "louer une voiture",
    "comparateur loueurs",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: publicEnv.siteName,
    url: publicEnv.siteUrl,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#141b2b",
  width: "device-width",
  initialScale: 1,
  // Le site est majoritairement consulte sur telephone : on occupe l'ecran
  // jusqu'aux bords et on gere les encoches avec env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
