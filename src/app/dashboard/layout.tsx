import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { signOut } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { agency } = await requirePro();
  const plan = getPlan(agency?.plan ?? "free");

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {agency?.name ?? "Mon espace professionnel"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={agency?.status === "published" ? "success" : "warning"}>
              {agency?.status === "published" ? "Fiche en ligne" : "Fiche hors ligne"}
            </Badge>
            <Badge variant="neutral">Palier {plan.name}</Badge>
            {agency?.status === "published" ? (
              <Link
                href={`/agence/${agency.slug}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900"
              >
                Voir ma fiche publique <ArrowUpRight className="size-3" />
              </Link>
            ) : null}
          </div>
        </div>

        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Se deconnecter
          </Button>
        </form>
      </div>

      {!agency ? (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-ink-900">Votre agence n&apos;est pas encore creee.</p>
            <p className="text-muted-foreground">
              Renseignez ses informations dans l&apos;onglet <strong>Mon agence</strong> pour
              commencer a publier des vehicules.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <DashboardNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
