import { Smartphone } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

/** Rappel commun : la reservation et les messages se font dans l'application. */
export function AppCta({ title = "Réservez dans l'application" }: { title?: string }) {
  return (
    <section className="rounded-card border border-brand/30 bg-brand-soft/60 p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-bold text-ink-900">{title}</p>
          <p className="max-w-xl text-sm text-ink-700">
            Demande de réservation, messages avec le loueur, suivi de la location et avis : tout se
            passe dans l&apos;application, gratuite pour les clients.
          </p>
        </div>
        <ButtonLink href="/pro#application" size="lg">
          <Smartphone /> Obtenir l&apos;application
        </ButtonLink>
      </div>
    </section>
  );
}
