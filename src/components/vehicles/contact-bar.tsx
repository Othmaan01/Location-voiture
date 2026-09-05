"use client";

import { MessageSquare, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

/**
 * Barre d'action fixe en bas d'ecran, sur mobile uniquement.
 *
 * Sur telephone, le formulaire de contact se retrouve tout en bas de la fiche,
 * apres les caracteristiques et les conditions : beaucoup de visiteurs ne
 * l'atteignent jamais. Cette barre garde l'appel et la demande a un pouce.
 * Au-dessus de `lg`, le formulaire est visible en colonne : la barre disparait.
 */
export function ContactBar({
  price,
  phone,
  targetId = "contact",
  label = "Demander",
}: {
  price?: number | null;
  phone?: string | null;
  targetId?: string;
  label?: string;
}) {
  function scrollToForm() {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="container-page flex items-center gap-3 pt-3">
        {price ? (
          <p className="shrink-0 leading-tight">
            <span className="text-lg font-semibold text-ink-900">{formatPrice(price)}</span>
            <span className="block text-[11px] text-muted-foreground">par jour</span>
          </p>
        ) : null}

        <div className="ml-auto flex flex-1 justify-end gap-2">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink-200 bg-surface px-4 text-sm font-medium text-ink-800"
            >
              <Phone className="size-4" /> Appeler
            </a>
          ) : null}
          <Button onClick={scrollToForm} className="flex-1 sm:flex-none">
            <MessageSquare /> {label}
          </Button>
        </div>
      </div>
    </div>
  );
}
