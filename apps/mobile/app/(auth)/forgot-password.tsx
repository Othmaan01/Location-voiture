import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import type { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import { ForgotSchema } from "@/lib/validation";
import { theme } from "@/theme";

type Form = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    const normalized = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalized);
    // Reponse identique que l'adresse existe ou non : pas d'enumeration de comptes.
    if (error && error.code !== "user_not_found") {
      setServerError(describeAuthError(error));
      return;
    }
    router.replace({ pathname: "/(auth)/verify", params: { email: normalized, type: "recovery" } });
  });

  return (
    <Screen title="Mot de passe oublié" back>
      <Text variant="sm" tone="muted">
        Si un compte existe avec cette adresse, vous recevrez un code à 6 chiffres.
      </Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void onSubmit()}
            />
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Envoyer le code"
          loading={formState.isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
