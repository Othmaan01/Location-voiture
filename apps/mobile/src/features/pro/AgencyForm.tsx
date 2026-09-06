import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";
import { z } from "zod";
import type { Agency, AgencyInput } from "@lv/contracts";

import { Button, Card, Input, Text } from "@/components/ui";
import { theme } from "@/theme";

const Schema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  addressLine: z.string().trim().max(200),
  postalCode: z.string().trim().max(10),
  cityName: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  email: z.union([z.literal(""), z.email("E-mail invalide")]),
});
type Form = z.infer<typeof Schema>;

interface Suggestion {
  label: string;
  addressLine: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

/** Geocodage gratuit et sans cle (France) : la position vient de l'adresse choisie, jamais saisie a la main. */
async function searchAddress(query: string): Promise<Suggestion[]> {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`,
  );
  if (!response.ok) return [];
  const json = (await response.json()) as {
    features?: {
      properties: { label: string; name: string; postcode: string; city: string };
      geometry: { coordinates: [number, number] };
    }[];
  };
  return (json.features ?? []).map((f) => ({
    label: f.properties.label,
    addressLine: f.properties.name,
    postalCode: f.properties.postcode,
    city: f.properties.city,
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
  }));
}

export function AgencyForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: Agency;
  submitting: boolean;
  onSubmit: (input: AgencyInput) => Promise<void>;
}) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initial && initial.latitude !== null && initial.longitude !== null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: initial?.name ?? "",
      addressLine: initial?.addressLine ?? "",
      postalCode: initial?.postalCode ?? "",
      cityName: initial?.cityName ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
    },
  });

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await onSubmit({
        name: v.name,
        addressLine: v.addressLine || null,
        postalCode: v.postalCode || null,
        cityName: v.cityName || null,
        phone: v.phone || null,
        email: v.email || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Nom de l'agence"
            hint="Ex. : Agence Part-Dieu"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="addressLine"
        render={({ field, fieldState }) => (
          <Input
            label="Adresse"
            hint={
              coords
                ? "Position enregistrée"
                : "Tapez l'adresse et choisissez une suggestion pour fixer la position"
            }
            value={field.value}
            onChangeText={(t) => {
              field.onChange(t);
              setCoords(null);
              if (t.trim().length >= 5) void searchAddress(t).then(setSuggestions);
              else setSuggestions([]);
            }}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="street-address"
          />
        )}
      />
      {suggestions.length > 0 ? (
        <Card padded={false}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.label}
              accessibilityRole="button"
              onPress={() => {
                setValue("addressLine", s.addressLine, { shouldDirty: true });
                setValue("postalCode", s.postalCode, { shouldDirty: true });
                setValue("cityName", s.city, { shouldDirty: true });
                setCoords({ latitude: s.latitude, longitude: s.longitude });
                setSuggestions([]);
              }}
              style={[
                styles.suggestion,
                i < suggestions.length - 1 ? styles.suggestionBorder : null,
              ]}
            >
              <Text variant="sm">{s.label}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      <View style={styles.row}>
        <View style={styles.third}>
          <Controller
            control={control}
            name="postalCode"
            render={({ field, fieldState }) => (
              <Input
                label="Code postal"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="number-pad"
              />
            )}
          />
        </View>
        <View style={styles.twoThirds}>
          <Controller
            control={control}
            name="cityName"
            render={({ field, fieldState }) => (
              <Input
                label="Ville"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input
            label="Téléphone de l'agence"
            hint="Transmis au client après confirmation"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="phone-pad"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="E-mail de l'agence (optionnel)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />
      {serverError ? (
        <Text variant="sm" tone="danger">
          {serverError}
        </Text>
      ) : null}
      <Button
        label={initial ? "Enregistrer" : "Créer l'agence"}
        loading={submitting || formState.isSubmitting}
        onPress={() => void submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  row: { flexDirection: "row", gap: theme.space["3"] },
  third: { flex: 1 },
  twoThirds: { flex: 2 },
  suggestion: { minHeight: 48, justifyContent: "center", paddingHorizontal: theme.space["4"] },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});
