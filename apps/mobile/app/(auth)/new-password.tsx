import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import type { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import { PASSWORD_HINT, NewPasswordSchema } from "@/lib/validation";
import { theme } from "@/theme";

type Form = z.infer<typeof NewPasswordSchema>;

/** Apres verification du code de recuperation : choix du nouveau mot de passe (session temporaire active). */
export default function NewPasswordScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(describeAuthError(error));
      return;
    }
    router.dismissAll();
  });

  return (
    <Screen title="Nouveau mot de passe">
      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label="Nouveau mot de passe"
              hint={PASSWORD_HINT}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
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
          label="Enregistrer"
          loading={formState.isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
