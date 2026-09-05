"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FUELS, TRANSMISSIONS, VEHICLE_CATEGORIES, VEHICLE_OPTIONS } from "@/lib/constants";
import { initialActionState } from "@/lib/action-state";
import { saveVehicle, deleteVehicle } from "@/server/actions/vehicles";
import type { PlanTier, Vehicle } from "@/types/database";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {label}
    </Button>
  );
}

export function VehicleForm({
  vehicle,
  plan,
  canPublish,
}: {
  vehicle?: Vehicle;
  plan: PlanTier;
  canPublish: boolean;
}) {
  const [state, formAction] = useActionState(saveVehicle, initialActionState);
  const [imageUrls, setImageUrls] = useState<string[]>(vehicle?.images ?? []);
  const [newImage, setNewImage] = useState("");

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  const isEdit = Boolean(vehicle);
  const allowFeatured = plan === "pro";

  return (
    <form action={formAction} className="space-y-6">
      {vehicle ? <input type="hidden" name="vehicleId" value={vehicle.id} /> : null}
      {imageUrls.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      <Card>
        <CardContent className="space-y-5">
          <h2 className="text-base font-semibold text-ink-900">Identite du vehicule</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marque" required error={state.errors?.brand} htmlFor="brand">
              <Input id="brand" name="brand" defaultValue={vehicle?.brand} required placeholder="Renault" />
            </Field>
            <Field label="Modele" required error={state.errors?.model} htmlFor="model">
              <Input id="model" name="model" defaultValue={vehicle?.model} required placeholder="Clio V" />
            </Field>
            <Field label="Finition" error={state.errors?.version} htmlFor="version">
              <Input id="version" name="version" defaultValue={vehicle?.version ?? ""} placeholder="Evolution" />
            </Field>
            <Field label="Annee" error={state.errors?.year} htmlFor="year">
              <Input id="year" name="year" type="number" min={1950} max={new Date().getFullYear() + 1} defaultValue={vehicle?.year ?? ""} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Categorie" required htmlFor="category">
              <Select id="category" name="category" defaultValue={vehicle?.category ?? "citadine"}>
                {VEHICLE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Boite" required htmlFor="transmission">
              <Select id="transmission" name="transmission" defaultValue={vehicle?.transmission ?? "manuelle"}>
                {TRANSMISSIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Energie" required htmlFor="fuel">
              <Select id="fuel" name="fuel" defaultValue={vehicle?.fuel ?? "essence"}>
                {FUELS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Places" htmlFor="seats">
              <Input id="seats" name="seats" type="number" min={1} max={60} defaultValue={vehicle?.seats ?? 5} />
            </Field>
            <Field label="Portes" htmlFor="doors">
              <Input id="doors" name="doors" type="number" min={2} max={6} defaultValue={vehicle?.doors ?? 5} />
            </Field>
            <Field label="Bagages" htmlFor="luggage">
              <Input id="luggage" name="luggage" type="number" min={0} max={20} defaultValue={vehicle?.luggage ?? 2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <h2 className="text-base font-semibold text-ink-900">Tarifs et conditions</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix / jour (€)" required error={state.errors?.pricePerDay} htmlFor="pricePerDay">
              <Input id="pricePerDay" name="pricePerDay" type="number" min={1} step="0.01" defaultValue={vehicle?.price_per_day ?? ""} required />
            </Field>
            <Field label="Prix / semaine (€)" htmlFor="pricePerWeek">
              <Input id="pricePerWeek" name="pricePerWeek" type="number" min={0} step="0.01" defaultValue={vehicle?.price_per_week ?? ""} />
            </Field>
            <Field label="Prix / mois (€)" htmlFor="pricePerMonth">
              <Input id="pricePerMonth" name="pricePerMonth" type="number" min={0} step="0.01" defaultValue={vehicle?.price_per_month ?? ""} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Caution (€)" htmlFor="depositAmount">
              <Input id="depositAmount" name="depositAmount" type="number" min={0} step="1" defaultValue={vehicle?.deposit_amount ?? ""} />
            </Field>
            <Field label="Km inclus / jour" htmlFor="mileageIncludedDay">
              <Input id="mileageIncludedDay" name="mileageIncludedDay" type="number" min={0} defaultValue={vehicle?.mileage_included_day ?? ""} />
            </Field>
            <Field label="Prix du km sup. (€)" htmlFor="extraKmPrice">
              <Input id="extraKmPrice" name="extraKmPrice" type="number" min={0} step="0.01" defaultValue={vehicle?.extra_km_price ?? ""} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <h2 className="text-base font-semibold text-ink-900">Equipements et description</h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VEHICLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink-700 hover:bg-surface-muted"
              >
                <Checkbox
                  name="options"
                  value={option.value}
                  defaultChecked={vehicle?.options?.includes(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          <Field label="Description" error={state.errors?.description} htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={vehicle?.description ?? ""}
              placeholder="Etat du vehicule, entretien, conditions particulieres..."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-ink-900">Photos</h2>
          <p className="text-sm text-muted-foreground">
            Collez l&apos;URL publique d&apos;une photo. Le televersement direct depuis Supabase
            Storage est prevu dans une prochaine iteration.
          </p>

          <div className="flex gap-2">
            <Input
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!newImage.trim()) return;
                setImageUrls((prev) => [...prev, newImage.trim()]);
                setNewImage("");
              }}
            >
              Ajouter
            </Button>
          </div>

          {imageUrls.length > 0 ? (
            <ul className="space-y-2">
              {imageUrls.map((url, index) => (
                <li
                  key={`${url}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-xs"
                >
                  <span className="truncate text-ink-700">{url}</span>
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 text-danger"
                    aria-label="Retirer la photo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-ink-900">Publication</h2>

          <Field
            label="Statut"
            hint={
              canPublish
                ? undefined
                : "Vous avez atteint le quota de votre palier : ce vehicule restera en brouillon."
            }
            htmlFor="status"
          >
            <Select id="status" name="status" defaultValue={vehicle?.status ?? "draft"}>
              <option value="draft">Brouillon (invisible)</option>
              <option value="published" disabled={!canPublish && vehicle?.status !== "published"}>
                Publie (visible sur la carte)
              </option>
              <option value="archived">Archive</option>
            </Select>
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-ink-700">
            <Checkbox
              name="isFeatured"
              defaultChecked={vehicle?.is_featured}
              disabled={!allowFeatured}
            />
            Mettre en avant dans les resultats
            {!allowFeatured ? (
              <Link href="/dashboard/abonnement" className="text-xs font-medium text-amber-brand-dark underline">
                (palier Pro requis)
              </Link>
            ) : null}
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={isEdit ? "Enregistrer les modifications" : "Creer le vehicule"} />
        <Button variant="ghost" type="reset">
          Annuler
        </Button>

        {vehicle ? (
          <span className="ml-auto">
            <Button
              variant="danger"
              size="sm"
              type="submit"
              formAction={deleteVehicle}
              formNoValidate
            >
              <Trash2 /> Supprimer
            </Button>
          </span>
        ) : null}
      </div>
    </form>
  );
}
