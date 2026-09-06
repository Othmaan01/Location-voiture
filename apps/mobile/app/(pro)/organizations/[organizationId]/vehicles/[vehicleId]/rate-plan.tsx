import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useSetRatePlan, useVehicle } from "@/lib/queries-catalog";
import { theme } from "@/theme";

const euros = z.string().regex(/^$|^\d{1,6}([.,]\d{1,2})?$/, "Montant invalide");
const Schema = z.object({
  daily: z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/, "Montant requis"),
  weekend: euros,
  weekly: euros,
  monthly: euros,
  deposit: euros,
  kmIncluded: z.string().regex(/^$|^\d{1,5}$/, "Nombre entier"),
  extraKm: euros,
  minDays: z.string().regex(/^[1-9]\d{0,2}$/, "1 à 365"),
});
type Form = z.infer<typeof Schema>;

/** Saisie en euros, conversion en centimes avant envoi : le serveur ne recoit jamais de flottant. */
const toCents = (v: string): number | null =>
  v === "" ? null : Math.round(Number(v.replace(",", ".")) * 100);
const fromCents = (c: number | null | undefined): string =>
  c == null ? "" : (c / 100).toString().replace(".", ",");

export default function RatePlanScreen() {
  const { organizationId, vehicleId } = useLocalSearchParams<{
    organizationId: string;
    vehicleId: string;
  }>();
  const router = useRouter();
  const vehicle = useVehicle(vehicleId);
  const save = useSetRatePlan(organizationId, vehicleId);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      daily: "",
      weekend: "",
      weekly: "",
      monthly: "",
      deposit: "",
      kmIncluded: "",
      extraKm: "",
      minDays: "1",
    },
  });

  useEffect(() => {
    const p = vehicle.data?.ratePlan;
    if (p)
      reset({
        daily: fromCents(p.dailyCents),
        weekend: fromCents(p.weekendDailyCents),
        weekly: fromCents(p.weeklyCents),
        monthly: fromCents(p.monthlyCents),
        deposit: fromCents(p.depositCents),
        kmIncluded: p.kmIncludedPerDay?.toString() ?? "",
        extraKm: fromCents(p.extraKmCents),
        minDays: p.minDays.toString(),
      });
  }, [vehicle.data?.ratePlan, reset]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await save.mutateAsync({
        currency: "EUR",
        dailyCents: toCents(v.daily)!,
        weekendDailyCents: toCents(v.weekend),
        weeklyCents: toCents(v.weekly),
        monthlyCents: toCents(v.monthly),
        depositCents: toCents(v.deposit) ?? 0,
        kmIncludedPerDay: v.kmIncluded ? Number(v.kmIncluded) : null,
        extraKmCents: toCents(v.extraKm),
        minDays: Number(v.minDays),
        maxDays: null,
      });
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "Enregistrement impossible.");
    }
  });

  const money = (name: keyof Form, label: string, hint?: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          hint={hint}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      )}
    />
  );

  return (
    <Screen title="Tarif" back>
      <Text variant="sm" tone="muted">
        Prix affichés au client tels quels. Le règlement se fait entre vous et lui, jamais sur
        l'application.
      </Text>
      <View style={styles.form}>
        {money("daily", "Prix par jour (€)")}
        <View style={styles.row}>
          <View style={styles.half}>
            {money("weekend", "Jour de week-end (€)", "Samedi et dimanche, optionnel")}
          </View>
          <View style={styles.half}>{money("weekly", "Forfait 7 jours (€)", "Optionnel")}</View>
        </View>
        {money("monthly", "Forfait 30 jours (€)", "Optionnel")}
        {money("deposit", "Caution (€)", "Réglée à l'agence, jamais sur l'app")}
        <View style={styles.row}>
          <View style={styles.half}>
            <Controller
              control={control}
              name="kmIncluded"
              render={({ field, fieldState }) => (
                <Input
                  label="Km inclus / jour"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  keyboardType="number-pad"
                  placeholder="Illimité"
                />
              )}
            />
          </View>
          <View style={styles.half}>{money("extraKm", "Km supplémentaire (€)")}</View>
        </View>
        <Controller
          control={control}
          name="minDays"
          render={({ field, fieldState }) => (
            <Input
              label="Durée minimale (jours)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
              maxLength={3}
            />
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Enregistrer le tarif"
          loading={save.isPending || formState.isSubmitting}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  row: { flexDirection: "row", gap: theme.space["3"] },
  half: { flex: 1 },
});
