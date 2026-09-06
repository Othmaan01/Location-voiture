import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
      <p className="text-6xl font-semibold text-ink-200">404</p>
      <h1 className="text-2xl font-semibold text-ink-900">Cette page n&apos;existe pas</h1>
      <p className="max-w-md text-muted-foreground">
        Le loueur ou la page que vous cherchez a peut-être été retiré. Explorez les loueurs pour
        trouver une alternative près de chez vous.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/recherche">Explorer les loueurs</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Retour a l&apos;accueil
        </ButtonLink>
      </div>
    </div>
  );
}
