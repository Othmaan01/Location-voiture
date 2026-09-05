import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { publicEnv } from "@/lib/env";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Louer",
    links: [
      { href: "/recherche", label: "Rechercher un vehicule" },
      { href: "/villes", label: "Toutes les villes" },
      { href: "/recherche?categories=utilitaire", label: "Utilitaires" },
      { href: "/recherche?categories=prestige", label: "Vehicules de prestige" },
    ],
  },
  {
    title: "Professionnels",
    links: [
      { href: "/pro", label: "Referencer mon agence" },
      { href: "/tarifs", label: "Tarifs et paliers" },
      { href: "/inscription?profil=pro", label: "Creer un compte pro" },
      { href: "/connexion", label: "Acceder a mon tableau de bord" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { href: "/a-propos", label: "A propos" },
      { href: "/contact", label: "Contact" },
      { href: "/mentions-legales", label: "Mentions legales" },
      { href: "/confidentialite", label: "Confidentialite" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-surface-muted/70">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            L&apos;annuaire cartographie des loueurs de voitures. Les particuliers trouvent une
            agence pres de chez eux, les professionnels gagnent en visibilite.
          </p>
          <p className="text-xs text-ink-400">
            Aucune commission sur les locations. La mise en relation est directe.
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

      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {publicEnv.siteName}. Tous droits reserves.
          </p>
          <p>Fonds de carte &copy; OpenStreetMap contributors.</p>
        </div>
      </div>
    </footer>
  );
}
