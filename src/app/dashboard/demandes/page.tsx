import Link from "next/link";
import { CalendarRange, Car, Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setLeadStatus } from "@/server/actions/agencies";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Lead, LeadStatus, Vehicle } from "@/types/database";

const STATUS_LABEL: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacte",
  converti: "Converti",
  perdu: "Perdu",
};

const NEXT_ACTIONS: Record<LeadStatus, { status: LeadStatus; label: string }[]> = {
  nouveau: [
    { status: "contacte", label: "Marquer contacte" },
    { status: "perdu", label: "Perdu" },
  ],
  contacte: [
    { status: "converti", label: "Converti" },
    { status: "perdu", label: "Perdu" },
  ],
  converti: [{ status: "contacte", label: "Rouvrir" }],
  perdu: [{ status: "nouveau", label: "Rouvrir" }],
};

export default async function LeadsPage() {
  const { agency } = await requirePro();

  if (!agency) {
    return (
      <EmptyState
        title="Creez d'abord votre agence"
        description="Les demandes sont rattachees a votre fiche agence."
      />
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  const leads = (data as Lead[] | null) ?? [];

  const vehicleIds = Array.from(
    new Set(leads.map((lead) => lead.vehicle_id).filter((id): id is string => Boolean(id))),
  );

  let vehicleMap = new Map<string, Vehicle>();
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await supabase.from("vehicles").select("*").in("id", vehicleIds);
    vehicleMap = new Map(((vehicles as Vehicle[] | null) ?? []).map((v) => [v.id, v]));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Demandes recues</h2>
        <p className="text-sm text-muted-foreground">
          {leads.length} demande{leads.length > 1 ? "s" : ""} au total. Repondez directement au
          client par telephone ou e-mail.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="Aucune demande pour le moment"
          description="Publiez votre fiche et vos vehicules pour commencer a recevoir des demandes."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const vehicle = lead.vehicle_id ? vehicleMap.get(lead.vehicle_id) : undefined;
            return (
              <Card key={lead.id}>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-900">
                        {lead.first_name} {lead.last_name ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recue le {formatDateTime(lead.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        lead.status === "nouveau"
                          ? "accent"
                          : lead.status === "converti"
                            ? "success"
                            : lead.status === "perdu"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {STATUS_LABEL[lead.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:text-amber-brand-dark"
                    >
                      <Mail className="size-4" /> {lead.email}
                    </a>
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:text-amber-brand-dark"
                      >
                        <Phone className="size-4" /> {lead.phone}
                      </a>
                    ) : null}
                    {lead.desired_start ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <CalendarRange className="size-4" />
                        {formatDate(lead.desired_start)}
                        {lead.desired_end ? ` → ${formatDate(lead.desired_end)}` : ""}
                      </span>
                    ) : null}
                    {vehicle ? (
                      <Link
                        href={`/vehicule/${vehicle.id}`}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-ink-900"
                      >
                        <Car className="size-4" /> {vehicle.brand} {vehicle.model}
                      </Link>
                    ) : null}
                  </div>

                  {lead.message ? (
                    <p className="whitespace-pre-line rounded-xl bg-surface-muted p-3.5 text-sm text-ink-700">
                      {lead.message}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {NEXT_ACTIONS[lead.status].map((action) => (
                      <form key={action.status} action={setLeadStatus}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="status" value={action.status} />
                        <Button variant="outline" size="sm" type="submit">
                          {action.label}
                        </Button>
                      </form>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
