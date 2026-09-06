import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { z } from "zod";
import { OrganizationSchema, SirenSchema, type UpdateOrganizationBody } from "@lv/contracts";

import { Button, Card, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError, apiRequest } from "@/lib/api";
import {
  queryKeys,
  useCompanyLookup,
  useDeleteOrganization,
  useMe,
  useOrganization,
} from "@/lib/queries";
import { catalogKeys } from "@/lib/queries-catalog";
import { theme } from "@/theme";

const Schema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120),
  legalName: z.string().trim().max(200),
  siren: z.union([z.literal(""), SirenSchema]),
  billingEmail: z.union([z.literal(""), z.email("E-mail invalide")]),
});
type Form = z.infer<typeof Schema>;

/** Informations de l'organisation : nom, raison sociale, SIREN (requis pour la verification), e-mail de facturation, suppression. */
export default function EditOrganizationScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const org = useOrganization(organizationId);
  const me = useMe();
  const isOwner =
    me.data?.memberships.find((m) => m.organizationId === organizationId)?.role === "owner";
  const lookup = useCompanyLookup();
  const remove = useDeleteOrganization();
  const [serverError, setServerError] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: (body: UpdateOrganizationBody) =>
      apiRequest(`/v1/organizations/${organizationId}`, OrganizationSchema, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.organization(organizationId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(organizationId) });
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
  const { control, handleSubmit, reset, formState, watch, setValue } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", legalName: "", siren: "", billingEmail: "" },
  });
  const siren = watch("siren");

  const findCompany = () =>
    lookup.mutate(siren, {
      onSuccess: (c) => {
        setFound(c.legalName);
        setValue("legalName", c.legalName, { shouldDirty: true });
      },
      onError: (e) =>
        setServerError(e instanceof ApiRequestError ? e.message : "Annuaire indisponible."),
    });

  const confirmDelete = () =>
    Alert.alert(
      "Supprimer l'organisation ?",
      "Agences, véhicules, photos, documents et membres seront supprimés définitivement. Refusé s'il existe un historique de réservations.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            remove.mutate(organizationId, {
              onSuccess: () => router.replace("/(tabs)/profil"),
              onError: (e) =>
                Alert.alert(
                  "Suppression impossible",
                  e instanceof ApiRequestError ? e.message : "Réessayez.",
                ),
            }),
        },
      ],
    );

  useEffect(() => {
    if (org.data)
      reset({
        name: org.data.name,
        legalName: org.data.legalName ?? "",
        siren: org.data.siren ?? "",
        billingEmail: "",
      });
  }, [org.data, reset]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await update.mutateAsync({
        name: v.name,
        legalName: v.legalName || null,
        siren: v.siren || null,
        ...(v.billingEmail ? { billingEmail: v.billingEmail } : {}),
      });
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "Enregistrement impossible.");
    }
  });

  return (
    <Screen title="Informations" back>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Nom commercial"
              hint="Tel qu'il apparaît aux clients"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="legalName"
          render={({ field, fieldState }) => (
            <Input
              label="Raison sociale"
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
                  : "9 chiffres, requis pour la vérification. Le SIRET se renseigne sur chaque agence."
              }
              value={field.value}
              onChangeText={(t) => {
                setFound(null);
                field.onChange(t.replace(/\D/g, "").slice(0, 9));
              }}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
              maxLength={9}
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
        <Controller
          control={control}
          name="billingEmail"
          render={({ field, fieldState }) => (
            <Input
              label="E-mail de facturation (optionnel)"
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
          label="Enregistrer"
          loading={update.isPending || formState.isSubmitting}
          onPress={() => void submit()}
        />
      </View>
      {isOwner ? (
        <Card style={styles.dangerZone}>
          <Text variant="bodyStrong">Supprimer l'organisation</Text>
          <Text variant="sm" tone="muted">
            Tout est supprimé définitivement. Impossible s'il existe un historique de réservations :
            dans ce cas, dépubliez vos véhicules.
          </Text>
          <Button
            label="Supprimer l'organisation"
            variant="danger"
            icon={<Trash2 size={18} color={theme.colors.danger} />}
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  dangerZone: { gap: theme.space["3"], marginTop: theme.space["5"] },
});
