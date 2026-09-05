import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import type { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { describeAuthError } from "@/lib/auth-errors";
import { registerDeviceForPush } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { SignInSchema } from "@/lib/validation";
import { theme } from "@/theme";

type Form = z.infer<typeof SignInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (error.code === "email_not_confirmed") {
        router.push({
          pathname: "/(auth)/verify",
          params: { email: email.trim().toLowerCase(), type: "signup" },
        });
        return;
      }
      setServerError(describeAuthError(error));
      return;
    }
    void registerDeviceForPush();
    router.dismissAll();
  });

  return (
    <Screen title="Connexion" back>
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
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label="Mot de passe"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
            />
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger" accessibilityLiveRegion="assertive">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Se connecter"
          loading={formState.isSubmitting}
          onPress={() => void onSubmit()}
        />
        <Link href="/(auth)/forgot-password" style={styles.link}>
          <Text variant="smStrong" tone="accent">
            Mot de passe oublié ?
          </Text>
        </Link>
      </View>
      <View style={styles.footer}>
        <Text variant="sm" tone="muted">
          Pas encore de compte ?
        </Text>
        <Link href="/(auth)/sign-up" replace>
          <Text variant="smStrong" tone="accent">
            Créer un compte
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  link: { alignSelf: "center", minHeight: theme.touch.minTarget, paddingTop: theme.space["2"] },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.space["1"],
    minHeight: theme.touch.minTarget,
    alignItems: "center",
  },
});
