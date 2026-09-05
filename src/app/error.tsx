"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
      <h1 className="text-2xl font-semibold text-ink-900">Une erreur est survenue</h1>
      <p className="max-w-md text-muted-foreground">
        Le chargement de cette page a echoue. Reessayez dans un instant : si le probleme persiste,
        verifiez que la base de donnees est bien accessible.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Reessayer</Button>
        <ButtonLink href="/" variant="outline">
          Retour a l&apos;accueil
        </ButtonLink>
      </div>
    </div>
  );
}
