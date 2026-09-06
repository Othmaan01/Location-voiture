import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { publicEnv } from "@/lib/env";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${publicEnv.siteName} — Loueurs de voitures professionnels, sans commission`,
    template: `%s | ${publicEnv.siteName}`,
  },
  description:
    "Trouvez un loueur de voitures professionnel vérifié près de chez vous, comparez les prix et réservez directement avec lui. Aucune commission sur la location.",
  keywords: [
    "location de voiture",
    "loueur de voiture",
    "agence de location",
    "louer une voiture",
    "loueur vérifié",
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
  themeColor: "#0e0e11",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body
        className="flex min-h-dvh flex-col"
        style={{ fontFamily: "var(--font-manrope), var(--font-sans)" }}
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
