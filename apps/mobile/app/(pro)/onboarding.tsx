import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { SirenSchema } from "@lv/contracts";

import { Button, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useCompanyLookup, useCreateOrganization } from "@/lib/queries";
import { theme } from "@/theme";

const Schema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  legalName: z.string().trim().max(200),
  siren: z.union([z.literal(""), SirenSchema]),
});
type Form = z.infer<typeof Schema>;

/** Creation de l'organisation : premiere etape de l'espace pro. Verification et vehicules en Phase 2. */
export default function ProOnboardingScreen() {
  const router = useRouter();
  const create = useCreateOrganization();
  const lookup = useCompanyLookup();
  const [serverError, setServerError] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const { control, handleSubmit, formState, watch, setValue, getValues } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", legalName: "", siren: "" },
  });
  const siren = watch("siren");

  /** Annuaire officiel : pre-remplit la raison sociale (et le nom s'il est vide). */
  const findCompany = () =>
    lookup.mutate(siren, {
      onSuccess: (c) => {
        setFound(c.legalName);
        setValue("legalName", c.legalName, { shouldDirty: true });
        if (!getValues("name").trim()) setValue("name", c.legalName, { shouldDirty: true });
      },
      onError: (e) =>
        setServerError(e instanceof ApiRequestError ? e.message : "Annuaire indisponible."),
    });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const org = await create.mutateAsync({
        name: values.name,
        countryCode: "FR",
        ...(values.legalName ? { legalName: values.legalName } : {}),
        ...(values.siren ? { siren: values.siren } : {}),
      });
      router.replace(`/(pro)/organizations/${org.id}`);
    } catch (error) {
      setServerError(
        error instanceof ApiRequestError && error.status < 500
          ? error.message
          : "Création impossible. Réessayez.",
      );
    }
  });

  return (
    <Screen eyebrow="Espace professionnel" title="Votre organisation" back>
      <Text variant="sm" tone="muted">
        Vous pourrez préparer votre flotte immédiatement. La publication sera possible après
        vérification de votre entreprise.
      </Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Nom commercial"
              hint="Tel qu'il apparaîtra aux clients"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="organization"
            />
          )}
        />
        <Controller
          control={control}
          name="legalName"
          render={({ field, fieldState }) => (
            <Input
              label="Raison sociale (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="siren"
          render={({ field, fieldState }) => (
            <Input
              label="SIREN de l'entreprise"
              hint={
                found
                  ? `Entreprise trouvée : ${found}`
                  : "9 chiffres. Le SIRET de chaque agence viendra ensuite."
              }
              value={field.value}
              onChangeText={(v) => {
                setFound(null);
                field.onChange(v.replace(/\D/g, "").slice(0, 9));
              }}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
            />
          )}
        />
        {siren.length === 9 ? (
          <Button
            label="Retrouver mon entreprise"
            variant="ghost"
            size="sm"
            loading={lookup.isPending}
            onPress={findCompany}
          />
        ) : null}
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Créer l'organisation"
          loading={formState.isSubmitting || create.isPending}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
