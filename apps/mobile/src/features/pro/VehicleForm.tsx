import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, View, type TextInput } from "react-native";
import { z } from "zod";
import {
  listBrands,
  listModels,
  normalizeBrand,
  normalizeModel,
  type Agency,
  type Vehicle,
  type VehicleInput,
  LicensePlateSchema,
  formatLicensePlate,
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
  licensePlate: z.union([z.literal(""), LicensePlateSchema]),
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
  const model = watch("model");
  const [open, setOpen] = useState<"brand" | "model" | null>(null);
  const modelRef = useRef<TextInput>(null);
  const brandChoices = open === "brand" ? listBrands(brand).filter((b) => b !== brand) : [];
  const modelChoices = open === "model" ? listModels(brand, model).filter((m) => m !== model) : [];

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
              <Input
                label="Marque"
                value={field.value}
                onChangeText={(t) => {
                  field.onChange(t);
                  setOpen("brand");
                }}
                onFocus={() => setOpen("brand")}
                onBlur={() => {
                  field.onChange(normalizeBrand(field.value));
                  field.onBlur();
                }}
                error={fieldState.error?.message}
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="model"
            render={({ field, fieldState }) => (
              <Input
                ref={modelRef}
                label="Modèle"
                value={field.value}
                onChangeText={(t) => {
                  field.onChange(t);
                  setOpen("model");
                }}
                onFocus={() => setOpen("model")}
                onBlur={() => {
                  field.onChange(normalizeModel(brand, field.value));
                  field.onBlur();
                }}
                error={fieldState.error?.message}
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}
          />
        </View>
      </View>
      {open === "brand" && brandChoices.length > 0 ? (
        <DropList
          items={brandChoices}
          onPick={(b) => {
            setValue("brand", b, { shouldDirty: true, shouldValidate: true });
            setValue("model", "", { shouldDirty: true });
            setOpen("model");
            modelRef.current?.focus();
          }}
        />
      ) : null}
      {open === "model" && modelChoices.length > 0 ? (
        <DropList
          items={modelChoices}
          onPick={(m) => {
            setValue("model", m, { shouldDirty: true, shouldValidate: true });
            setOpen(null);
          }}
        />
      ) : null}
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
                hint="Format AA-123-AA, jamais montrée aux clients"
                value={field.value}
                onChangeText={(t) => field.onChange(formatLicensePlate(t))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="characters"
                placeholder="AA-123-AA"
                maxLength={9}
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

/** Liste deroulante vivante sous la ligne marque/modele : alphabetique, filtree par le prefixe tape. */
function DropList({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  return (
    <ScrollView
      style={styles.drop}
      keyboardShouldPersistTaps="always"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {items.map((item, i) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          onPress={() => onPick(item)}
          style={({ pressed }) => [
            styles.dropRow,
            i < items.length - 1 ? styles.dropBorder : null,
            pressed ? styles.dropPressed : null,
          ]}
        >
          <Text variant="body">{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  drop: {
    maxHeight: 264,
    marginTop: -theme.space["2"],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropRow: { paddingHorizontal: theme.space["4"], minHeight: 46, justifyContent: "center" },
  dropBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dropPressed: { backgroundColor: theme.colors.surfaceHigh },
  form: { gap: theme.space["4"] },
  row: { flexDirection: "row", gap: theme.space["3"] },
  half: { flex: 1 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
