import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { z } from "zod";
import {
  normalizeBrand,
  normalizeModel,
  suggestBrands,
  suggestModels,
  type Agency,
  type Vehicle,
  type VehicleInput,
} from "@lv/contracts";

import { Button, Input, Select, Text } from "@/components/ui";
import {
  CATEGORY_OPTIONS,
  ENABLED_CATEGORY_OPTIONS,
  FUEL_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "@/features/pro/labels";
import { theme } from "@/theme";

const Schema = z.object({
  agencyId: z.string().min(1, "Choisissez une agence"),
  brand: z.string().trim().min(1, "Requis").max(60),
  model: z.string().trim().min(1, "Requis").max(60),
  version: z.string().trim().max(60),
  year: z.string().regex(/^$|^(19[5-9]\d|20\d\d|2100)$/, "Année invalide"),
  category: z.enum(CATEGORY_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  transmission: z.enum(["manuelle", "automatique"]),
  fuel: z.enum(FUEL_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  seats: z.string().regex(/^[1-9]\d?$/, "1 à 60"),
  licensePlate: z.string().trim().max(20),
  description: z.string().trim().max(4000),
  minDriverAge: z.string().regex(/^(1[6-9]|[2-9]\d)$/, "16 à 99"),
  minLicenseYears: z.string().regex(/^\d{1,2}$/, "0 à 50"),
});
type Form = z.infer<typeof Schema>;

export function VehicleForm({
  agencies,
  initial,
  submitting,
  onSubmit,
}: {
  agencies: Agency[];
  initial?: Vehicle;
  submitting: boolean;
  onSubmit: (input: VehicleInput) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState, watch, setValue } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      agencyId: initial?.agencyId ?? agencies[0]?.id ?? "",
      brand: initial?.brand ?? "",
      model: initial?.model ?? "",
      version: initial?.version ?? "",
      year: initial?.year?.toString() ?? "",
      category: initial?.category ?? "citadine",
      transmission: initial?.transmission ?? "manuelle",
      fuel: initial?.fuel ?? "essence",
      seats: initial?.seats.toString() ?? "5",
      licensePlate: initial?.licensePlate ?? "",
      description: initial?.description ?? "",
      minDriverAge: initial?.minDriverAge.toString() ?? "21",
      minLicenseYears: initial?.minLicenseYears.toString() ?? "2",
    },
  });

  const brand = watch("brand");

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await onSubmit({
        agencyId: v.agencyId,
        brand: v.brand,
        model: v.model,
        version: v.version || null,
        year: v.year ? Number(v.year) : null,
        category: v.category as VehicleInput["category"],
        transmission: v.transmission,
        fuel: v.fuel as VehicleInput["fuel"],
        seats: Number(v.seats),
        doors: initial?.doors ?? 5,
        luggage: initial?.luggage ?? 2,
        licensePlate: v.licensePlate || null,
        description: v.description || null,
        options: initial?.options ?? [],
        minDriverAge: Number(v.minDriverAge),
        minLicenseYears: Number(v.minLicenseYears),
      });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  });

  const agencyOptions = agencies.map((a) => ({
    value: a.id,
    label: a.name,
    hint: a.cityName ?? undefined,
  }));

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="agencyId"
        render={({ field, fieldState }) => (
          <Select
            label="Agence de retrait"
            value={field.value || null}
            options={agencyOptions}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="brand"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Input
                  label="Marque"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={() => {
                    field.onChange(normalizeBrand(field.value));
                    field.onBlur();
                  }}
                  error={fieldState.error?.message}
                  autoCapitalize="words"
                />
                <Suggestions
                  items={suggestBrands(field.value).filter((b) => b !== field.value)}
                  onPick={(b) => setValue("brand", b, { shouldDirty: true })}
                />
              </View>
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="model"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Input
                  label="Modèle"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={() => {
                    field.onChange(normalizeModel(brand, field.value));
                    field.onBlur();
                  }}
                  error={fieldState.error?.message}
                  autoCapitalize="words"
                />
                <Suggestions
                  items={suggestModels(brand, field.value).filter((m) => m !== field.value)}
                  onPick={(m) => setValue("model", m, { shouldDirty: true })}
                />
              </View>
            )}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="version"
            render={({ field, fieldState }) => (
              <Input
                label="Finition (optionnel)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="year"
            render={({ field, fieldState }) => (
              <Input
                label="Année"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="number-pad"
                maxLength={4}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <Select
            label="Catégorie"
            value={field.value}
            options={ENABLED_CATEGORY_OPTIONS}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="transmission"
            render={({ field }) => (
              <Select
                label="Boîte"
                value={field.value}
                options={TRANSMISSION_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="fuel"
            render={({ field }) => (
              <Select
                label="Énergie"
                value={field.value}
                options={FUEL_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="seats"
            render={({ field, fieldState }) => (
              <Input
                label="Places"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="number-pad"
                maxLength={2}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="licensePlate"
            render={({ field, fieldState }) => (
              <Input
                label="Immatriculation"
                hint="Jamais montrée aux clients"
                value={field.value}
                onChangeText={(t) => field.onChange(t.toUpperCase())}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="characters"
              />
            )}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="minDriverAge"
            render={({ field, fieldState }) => (
              <Input
                label="Âge minimum"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="number-pad"
                maxLength={2}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="minLicenseYears"
            render={({ field, fieldState }) => (
              <Input
                label="Années de permis"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="number-pad"
                maxLength={2}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <Input
            label="Description (optionnel)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            numberOfLines={4}
            style={styles.multiline}
          />
        )}
      />
      {serverError ? (
        <Text variant="sm" tone="danger">
          {serverError}
        </Text>
      ) : null}
      <Button
        label={initial ? "Enregistrer" : "Créer le véhicule"}
        loading={submitting || formState.isSubmitting}
        onPress={() => void submit()}
      />
    </View>
  );
}

/** Puces de suggestion sous un champ : on tape « re », on touche « Renault ». */
function Suggestions({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.chips}
    >
      {items.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          onPress={() => onPick(item)}
          style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
        >
          <Text variant="smStrong">{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.space["2"] },
  chips: { gap: theme.space["2"], paddingVertical: 2 },
  chip: {
    paddingHorizontal: theme.space["3"],
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipPressed: { backgroundColor: theme.colors.surfaceHigh },
  form: { gap: theme.space["4"] },
  row: { flexDirection: "row", gap: theme.space["3"] },
  half: { flex: 1 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
