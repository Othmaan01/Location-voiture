import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Input, Screen, Text } from "@/components/ui";
import { registerDeviceForPush } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

/** Seconde etape de connexion : code de l'application d'authentification (TOTP). */
export default function MfaChallengeScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === "verified") ?? factors?.totp[0];
      if (!factor) {
        setError("Aucune application d'authentification n'est configurée.");
        return;
      }
      const { data, error: err } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.trim(),
      });
      if (err || !data) {
        setError("Code incorrect ou expiré.");
        return;
      }
      void registerDeviceForPush();
      router.dismissAll();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Vérification" back>
      <View style={styles.form}>
        <Text variant="sm" tone="muted">
          Entrez le code à six chiffres affiché par votre application d'authentification.
        </Text>
        <Input
          label="Code"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          error={error ?? undefined}
          onSubmitEditing={() => void submit()}
        />
        <Button
          label="Valider"
          disabled={code.length !== 6}
          loading={busy}
          onPress={() => void submit()}
        />
        <Button
          label="Se déconnecter"
          variant="ghost"
          size="sm"
          onPress={() => {
            void supabase.auth.signOut();
            router.dismissAll();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
