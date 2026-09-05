import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { SiretSchema } from "@lv/contracts";

import { Button, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useCreateOrganization } from "@/lib/queries";
import { theme } from "@/theme";

const Schema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  legalName: z.string().trim().max(200),
  siret: z.union([z.literal(""), SiretSchema]),
});
type Form = z.infer<typeof Schema>;

/** Creation de l'organisation : premiere etape de l'espace pro. Verification et vehicules en Phase 2. */
export default function ProOnboardingScreen() {
  const router = useRouter();
  const create = useCreateOrganization();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", legalName: "", siret: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const org = await create.mutateAsync({
        name: values.name,
        countryCode: "FR",
        ...(values.legalName ? { legalName: values.legalName } : {}),
        ...(values.siret ? { siret: values.siret } : {}),
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
          name="siret"
          render={({ field, fieldState }) => (
            <Input
              label="SIRET (optionnel)"
              hint="14 chiffres"
              value={field.value}
              onChangeText={(v) => field.onChange(v.replace(/\D/g, "").slice(0, 14))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
            />
          )}
        />
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
