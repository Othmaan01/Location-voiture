import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import type { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { describeAuthError } from "@/lib/auth-errors";
import { registerDeviceForPush } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { OtpSchema } from "@/lib/validation";
import { theme } from "@/theme";

type Form = z.infer<typeof OtpSchema>;
type Flow = "signup" | "recovery";

/** Saisie du code a 6 chiffres recu par e-mail : confirmation d'inscription ou recuperation. */
export default function VerifyScreen() {
  const router = useRouter();
  const { email, type } = useLocalSearchParams<{ email: string; type: Flow }>();
  const flow: Flow = type === "recovery" ? "recovery" : "signup";
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const onSubmit = handleSubmit(async ({ code }) => {
    setServerError(null);
    if (!email) return;
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: flow });
    if (error) {
      setServerError(describeAuthError(error));
      return;
    }
    if (flow === "recovery") {
      router.replace({ pathname: "/(auth)/new-password", params: { flow: "recovery" } });
      return;
    }
    void registerDeviceForPush();
    router.dismissAll();
  });

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setServerError(null);
    const { error } =
      flow === "recovery"
        ? await supabase.auth.resetPasswordForEmail(email)
        : await supabase.auth.resend({ type: "signup", email });
    if (error) setServerError(describeAuthError(error));
    else setCooldown(60);
  };

  return (
    <Screen title="Vérification" back>
      <Text variant="sm" tone="muted">
        Saisissez le code à 6 chiffres envoyé à <Text variant="smStrong">{email}</Text>.
      </Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <Input
              label="Code"
              value={field.value}
              onChangeText={(v) => field.onChange(v.replace(/\D/g, "").slice(0, 6))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              style={styles.code}
            />
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger" accessibilityLiveRegion="assertive">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Confirmer"
          loading={formState.isSubmitting}
          onPress={() => void onSubmit()}
        />
        <Button
          label={cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
          variant="ghost"
          disabled={cooldown > 0}
          onPress={() => void resend()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  code: { fontSize: 24, letterSpacing: 8, textAlign: "center" },
});
