import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";
import { Building2, Search } from "lucide-react-native";
import type { z } from "zod";

import { Button, Input, Screen, Text } from "@/components/ui";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import { PASSWORD_HINT, SignUpSchema } from "@/lib/validation";
import { theme } from "@/theme";

type Form = z.infer<typeof SignUpSchema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  /** Intention (D9) : definit l'espace d'ouverture ; modifiable ensuite dans le profil. Jamais un role. */
  const [intent, setIntent] = useState<"client" | "pro">("client");
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ firstName, lastName, email, password }) => {
    setServerError(null);
    const normalized = email.trim().toLowerCase();
    // Le role n'est JAMAIS transmis ici : le serveur ne lit que prenom et nom (ADR-0007).
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { first_name: firstName, last_name: lastName, preferred_mode: intent } },
    });
    if (error) {
      setServerError(describeAuthError(error));
      return;
    }
    if (data.session) {
      router.replace("/(tabs)");
      return;
    }
    router.replace({ pathname: "/(auth)/verify", params: { email: normalized, type: "signup" } });
  });

  return (
    <Screen title="Créer un compte" back>
      <View style={styles.form}>
        <View style={styles.intents}>
          {(
            [
              { key: "client", label: "Je cherche une voiture", Icon: Search },
              { key: "pro", label: "Je loue mes véhicules", Icon: Building2 },
            ] as const
          ).map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: intent === key }}
              onPress={() => setIntent(key)}
              style={[styles.intent, intent === key ? styles.intentOn : null]}
            >
              <Icon
                size={22}
                color={intent === key ? theme.colors.accentTint : theme.colors.textDim}
              />
              <Text variant="smStrong" tone={intent === key ? "default" : "muted"}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
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
                  textContentType="givenName"
                />
              )}
            />
          </View>
          <View style={styles.half}>
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
                  textContentType="familyName"
                />
              )}
            />
          </View>
        </View>
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
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label="Mot de passe"
              hint={PASSWORD_HINT}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger" accessibilityLiveRegion="assertive">
            {serverError}
          </Text>
        ) : null}
        <Text variant="small" tone="dim">
          En créant un compte, vous acceptez les conditions d'utilisation et la politique de
          confidentialité.
        </Text>
        <Button
          label="Continuer"
          loading={formState.isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
      <View style={styles.footer}>
        <Text variant="sm" tone="muted">
          Déjà un compte ?
        </Text>
        <Link href="/(auth)/sign-in" replace>
          <Text variant="smStrong" tone="accent">
            Se connecter
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.space["4"] },
  row: { flexDirection: "row", gap: theme.space["3"] },
  half: { flex: 1 },
  intents: { flexDirection: "row", gap: theme.space["2"] },
  intent: {
    flex: 1,
    minHeight: 84,
    gap: theme.space["2"],
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  intentOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.space["1"],
    minHeight: theme.touch.minTarget,
    alignItems: "center",
  },
});
