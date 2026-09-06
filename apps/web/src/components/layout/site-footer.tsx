import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { publicEnv } from "@/lib/env";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Louer",
    links: [
      { href: "/recherche", label: "Rechercher un véhicule" },
      { href: "/villes", label: "Toutes les villes" },
      { href: "/recherche?categories=prestige", label: "Véhicules de prestige" },
    ],
  },
  {
    title: "Loueurs",
    links: [
      { href: "/pro", label: "Publier ma flotte" },
      { href: "/tarifs", label: "Abonnement et paliers" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/contact", label: "Contact" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-surface/60">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            La mise en relation directe avec des loueurs de voitures professionnels vérifiés. Aucune
            commission : vous réglez le loueur, jamais la plateforme.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-600 transition-colors hover:text-ink-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200">
        <div className="container-page py-5 text-xs text-ink-500">
          &copy; {new Date().getFullYear()} {publicEnv.siteName}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
