"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MapPin, Save } from "lucide-react";
import { toast } from "sonner";

import { MapCanvas } from "@/components/map/lazy-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { AGENCY_SERVICES } from "@/lib/constants";
import { initialActionState } from "@/lib/action-state";
import { saveAgency, setAgencyStatus } from "@/server/actions/agencies";
import type { Agency } from "@/types/database";

interface CityLite {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  department_code: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />} Enregistrer
    </Button>
  );
}

export function AgencyForm({ agency, cities }: { agency: Agency | null; cities: CityLite[] }) {
  const [state, formAction] = useActionState(saveAgency, initialActionState);
  const [statusState, statusAction] = useActionState(setAgencyStatus, initialActionState);

  const [cityId, setCityId] = useState(agency?.city_id ?? "");
  const [latitude, setLatitude] = useState(agency?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(agency?.longitude?.toString() ?? "");

  useEffect(() => {
    if (!state.message) return;
    if (state.status === "success") toast.success(state.message);
    else if (state.status === "error") toast.error(state.message);
  }, [state]);

  useEffect(() => {
    if (!statusState.message) return;
    if (statusState.status === "success") toast.success(statusState.message);
    else if (statusState.status === "error") toast.error(statusState.message);
  }, [statusState]);

  const selectedCity = useMemo(() => cities.find((c) => c.id === cityId), [cities, cityId]);

  const mapCenter = useMemo<[number, number]>(() => {
    const lng = Number(longitude) || selectedCity?.longitude || 2.4;
    const lat = Number(latitude) || selectedCity?.latitude || 46.6;
    return [lng, lat];
  }, [latitude, longitude, selectedCity]);

  const hasPosition = Boolean(Number(latitude) && Number(longitude));

  function onCityChange(nextId: string) {
    setCityId(nextId);
    const city = cities.find((c) => c.id === nextId);
    if (city && !hasPosition) {
      setLatitude(city.latitude.toString());
      setLongitude(city.longitude.toString());
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <h2 className="text-base font-semibold text-ink-900">Identite</h2>

            <Field label="Nom de l'agence" required error={state.errors?.name} htmlFor="name">
              <Input id="name" name="name" defaultValue={agency?.name ?? ""} required />
            </Field>

            <Field label="Description" error={state.errors?.description} htmlFor="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={agency?.description ?? ""}
                placeholder="Presentez votre agence : anciennete, specialites, points forts..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="E-mail de contact" error={state.errors?.email} htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={agency?.email ?? ""} />
              </Field>
              <Field label="Telephone" error={state.errors?.phone} htmlFor="phone">
                <Input id="phone" name="phone" type="tel" defaultValue={agency?.phone ?? ""} />
              </Field>
              <Field label="Site internet" error={state.errors?.website} htmlFor="website">
                <Input id="website" name="website" type="url" defaultValue={agency?.website ?? ""} placeholder="https://" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <h2 className="text-base font-semibold text-ink-900">Adresse et position</h2>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Adresse" error={state.errors?.addressLine} htmlFor="addressLine">
                <Input id="addressLine" name="addressLine" defaultValue={agency?.address_line ?? ""} placeholder="18 rue de Berri" />
              </Field>
              <Field label="Code postal" error={state.errors?.postalCode} htmlFor="postalCode">
                <Input id="postalCode" name="postalCode" defaultValue={agency?.postal_code ?? ""} />
              </Field>
            </div>

            <Field label="Ville" htmlFor="cityId" hint="Determine la page ville sur laquelle vous apparaissez.">
              <Select id="cityId" name="cityId" value={cityId} onChange={(e) => onCityChange(e.target.value)}>
                <option value="">Selectionnez une ville</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {city.department_code ? ` (${city.department_code})` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="latitude">
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="48.8566"
                />
              </Field>
              <Field label="Longitude" htmlFor="longitude">
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="2.3522"
                />
              </Field>
            </div>

            <div className="h-64 overflow-hidden rounded-xl border border-ink-100">
              <MapCanvas
                points={
                  hasPosition
                    ? [
                        {
                          id: "agency",
                          latitude: Number(latitude),
                          longitude: Number(longitude),
                          label: "Ici",
                        },
                      ]
                    : []
                }
                center={mapCenter}
                zoom={hasPosition ? 14 : 11}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              Choisissez votre ville pour pre-remplir la position, puis affinez les coordonnees pour
              pointer exactement sur votre agence.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-base font-semibold text-ink-900">Services proposes</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AGENCY_SERVICES.map((service) => (
                <label
                  key={service.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink-700 hover:bg-surface-muted"
                >
                  <Checkbox
                    name="services"
                    value={service.value}
                    defaultChecked={agency?.services?.includes(service.value)}
                  />
                  {service.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <SubmitButton />
      </form>

      {agency ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink-900">
                {agency.status === "published" ? "Votre fiche est en ligne" : "Votre fiche est hors ligne"}
              </p>
              <p className="text-sm text-muted-foreground">
                {agency.status === "published"
                  ? "Elle apparait sur la carte et dans les resultats de recherche."
                  : "Publiez-la pour apparaitre sur la carte et dans les resultats."}
              </p>
            </div>
            <form action={statusAction}>
              <input
                type="hidden"
                name="status"
                value={agency.status === "published" ? "draft" : "published"}
              />
              <Button variant={agency.status === "published" ? "outline" : "primary"} type="submit">
                {agency.status === "published" ? "Retirer de la carte" : "Publier ma fiche"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
