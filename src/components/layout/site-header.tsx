"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, Menu, User, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { useSession } from "@/components/layout/use-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/recherche", label: "Rechercher" },
  { href: "/villes", label: "Villes" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/pro", label: "Espace pro" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { session } = useSession();

  const isAuthenticated = Boolean(session);
  const role = session?.role ?? null;

  const accountHref = role === "pro" || role === "admin" ? "/dashboard" : "/compte";

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Accueil RentMap">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-muted text-ink-900" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <ButtonLink href={accountHref} variant="outline" size="sm">
              {role === "pro" || role === "admin" ? (
                <>
                  <LayoutDashboard /> Tableau de bord
                </>
              ) : (
                <>
                  <User /> Mon compte
                </>
              )}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/connexion" variant="ghost" size="sm">
                <LogIn /> Connexion
              </ButtonLink>
              <ButtonLink href="/inscription?profil=pro" variant="primary" size="sm">
                Referencer mon agence
              </ButtonLink>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <div className="border-t border-ink-100 bg-background md:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-muted"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ink-100 pt-3">
              {isAuthenticated ? (
                <ButtonLink href={accountHref} variant="outline" onClick={() => setOpen(false)}>
                  Mon espace
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/connexion" variant="outline" onClick={() => setOpen(false)}>
                    Connexion
                  </ButtonLink>
                  <ButtonLink href="/inscription?profil=pro" onClick={() => setOpen(false)}>
                    Referencer mon agence
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
