import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { PhoneSchema } from "@lv/contracts";

import { Button, Input, Screen, Text } from "@/components/ui";
import { useMe, useUpdateProfile } from "@/lib/queries";
import { NameField } from "@/lib/validation";
import { theme } from "@/theme";

const Schema = z.object({
  firstName: NameField,
  lastName: NameField,
  phone: z.union([z.literal(""), PhoneSchema]),
});
type Form = z.infer<typeof Schema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const me = useMe();
  const update = useUpdateProfile();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });

  useEffect(() => {
    if (me.data)
      reset({
        firstName: me.data.firstName ?? "",
        lastName: me.data.lastName ?? "",
        phone: me.data.phone ?? "",
      });
  }, [me.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await update.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone === "" ? null : values.phone,
      });
      router.back();
    } catch {
      setServerError("Enregistrement impossible. Réessayez.");
    }
  });

  return (
    <Screen title="Informations" back>
      <View style={styles.form}>
        <Controller
          control={control}
          name="firstName"
          render={({ field, fieldState }) => (
            <Input
              label="Prénom"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="given-name"
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field, fieldState }) => (
            <Input
              label="Nom"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="family-name"
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Input
              label="Téléphone"
              hint="Transmis à l'agence uniquement après confirmation d'une réservation"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
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
          loading={formState.isSubmitting || update.isPending}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
