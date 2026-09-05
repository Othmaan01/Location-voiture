"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { initialActionState } from "@/lib/action-state";
import { submitLead } from "@/server/actions/leads";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <Send /> {pending ? "Envoi en cours..." : "Envoyer ma demande"}
    </Button>
  );
}

export function LeadForm({
  agencyId,
  vehicleId,
  agencyName,
}: {
  agencyId: string;
  vehicleId?: string;
  agencyName: string;
}) {
  const [state, formAction] = useActionState(submitLead, initialActionState);

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-success/30 bg-success/8 p-6 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="font-semibold text-ink-900">Demande envoyee</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="agencyId" value={agencyId} />
      {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
      {/* Honeypot anti-spam : invisible pour un humain. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        aria-hidden
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prenom" required error={state.errors?.firstName} htmlFor="lead-firstName">
          <Input id="lead-firstName" name="firstName" required autoComplete="given-name" />
        </Field>
        <Field label="Nom" error={state.errors?.lastName} htmlFor="lead-lastName">
          <Input id="lead-lastName" name="lastName" autoComplete="family-name" />
        </Field>
      </div>

      <Field label="E-mail" required error={state.errors?.email} htmlFor="lead-email">
        <Input id="lead-email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field label="Telephone" error={state.errors?.phone} htmlFor="lead-phone">
        <Input id="lead-phone" name="phone" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Du" htmlFor="lead-start">
          <Input id="lead-start" name="desiredStart" type="date" min={today} />
        </Field>
        <Field label="Au" htmlFor="lead-end">
          <Input id="lead-end" name="desiredEnd" type="date" min={today} />
        </Field>
      </div>

      <Field label="Message" error={state.errors?.message} htmlFor="lead-message">
        <Textarea
          id="lead-message"
          name="message"
          placeholder={`Bonjour ${agencyName}, je souhaite louer ce vehicule...`}
        />
      </Field>

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Vos coordonnees sont transmises uniquement a cette agence.
      </p>
    </form>
  );
}
