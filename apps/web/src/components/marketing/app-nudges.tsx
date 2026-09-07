"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";

/**
 * Deux invitations discretes, uniquement sur telephone, une seule fois par session :
 * - une barre en bas de l'ecran, apres 2 s, vers l'application ;
 * - une annonce en verre, apres un tiers de page lu, vers la recherche.
 * Jamais de plein ecran, jamais bloquant, fermables d'un geste.
 */
export function AppNudges() {
  const pathname = usePathname();
  const [bar, setBar] = useState(false);
  const [card, setCard] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/application")) return;
    let barShown = false;
    let cardShown = false;
    try {
      barShown = sessionStorage.getItem("nudge-bar") === "1";
      cardShown = sessionStorage.getItem("nudge-card") === "1";
    } catch {
      /* stockage indisponible : on affiche quand meme, une fois */
    }
    const timer = barShown ? undefined : setTimeout(() => setBar(true), 2000);
    const onScroll = () => {
      if (cardShown) return;
      const ratio = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      if (ratio > 0.33) {
        setCard(true);
        cardShown = true;
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  const close = (key: "nudge-bar" | "nudge-card") => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    if (key === "nudge-bar") setBar(false);
    else setCard(false);
  };

  return (
    <div className="md:hidden">
      {card ? (
        <div
          role="status"
          className="glass fixed inset-x-4 top-20 z-40 flex items-start gap-3 rounded-2xl p-4 shadow-lift animate-[nudge-in_420ms_cubic-bezier(0.2,0.7,0.2,1)]"
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-tint">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">Une voiture ce week-end ?</p>
            <p className="mt-0.5 text-xs text-ink-600">
              Les loueurs vérifiés près de vous répondent en général en quelques heures.
            </p>
            <Link
              href="/recherche"
              onClick={() => close("nudge-card")}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-tint"
            >
              Voir les véhicules disponibles <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <button aria-label="Fermer" onClick={() => close("nudge-card")} className="text-ink-500">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      {bar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-[nudge-up_420ms_cubic-bezier(0.2,0.7,0.2,1)]">
          <div className="glass flex items-center gap-3 rounded-2xl p-3 shadow-lift">
            <LogoMark className="size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">
                Réservez plus vite dans l&apos;application
              </p>
              <p className="truncate text-xs text-ink-500">
                Demande, messages et suivi de location.
              </p>
            </div>
            <Link
              href="/application"
              onClick={() => close("nudge-bar")}
              className="rounded-full bg-brand px-3.5 py-2 text-xs font-bold text-white"
            >
              Ouvrir
            </Link>
            <button aria-label="Fermer" onClick={() => close("nudge-bar")} className="text-ink-500">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
