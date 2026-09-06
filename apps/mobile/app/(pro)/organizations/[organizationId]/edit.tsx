import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { OrganizationSchema, SiretSchema, type UpdateOrganizationBody } from "@lv/contracts";

import { Button, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { queryKeys, useOrganization } from "@/lib/queries";
import { catalogKeys } from "@/lib/queries-catalog";
import { theme } from "@/theme";

const Schema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  legalName: z.string().trim().max(200),
  siret: z.union([z.literal(""), SiretSchema]),
  billingEmail: z.union([z.literal(""), z.email("E-mail invalide")]),
});
type Form = z.infer<typeof Schema>;

/** Informations de l'organisation : nom, raison sociale, SIRET (requis pour la verification), e-mail de facturation. */
export default function EditOrganizationScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const org = useOrganization(organizationId);
  const [serverError, setServerError] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: (body: UpdateOrganizationBody) => apiRequest(`/v1/organizations/${organizationId}`, OrganizationSchema, { method: "PATCH", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.organization(organizationId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(organizationId) });
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
  const { control, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { name: "", legalName: "", siret: "", billingEmail: "" } });

  useEffect(() => {
    if (org.data) reset({ name: org.data.name, legalName: org.data.legalName ?? "", siret: org.data.siret ?? "", billingEmail: "" });
  }, [org.data, reset]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await update.mutateAsync({ name: v.name, legalName: v.legalName || null, siret: v.siret || null, ...(v.billingEmail ? { billingEmail: v.billingEmail } : {}) });
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "Enregistrement impossible.");
    }
  });

  return (
    <Screen title="Informations" back>
      <View style={styles.form}>
        <Controller control={control} name="name" render={({ field, fieldState }) => <Input label="Nom commercial" hint="Tel qu'il apparaît aux clients" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />} />
        <Controller control={control} name="legalName" render={({ field, fieldState }) => <Input label="Raison sociale" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />} />
        <Controller control={control} name="siret" render={({ field, fieldState }) => <Input label="SIRET" hint="14 chiffres, requis pour la vérification" value={field.value} onChangeText={(t) => field.onChange(t.replace(/\D/g, "").slice(0, 14))} onBlur={field.onBlur} error={fieldState.error?.message} keyboardType="number-pad" maxLength={14} />} />
        <Controller control={control} name="billingEmail" render={({ field, fieldState }) => <Input label="E-mail de facturation (optionnel)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} autoCapitalize="none" keyboardType="email-address" />} />
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Button label="Enregistrer" loading={update.isPending || formState.isSubmitting} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
