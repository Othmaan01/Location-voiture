import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { KeyRound, ShieldCheck } from "lucide-react-native";

import { Badge, Button, Card, Input, Screen, Text } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

interface Factor {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string | null;
}

/**
 * Double authentification (TOTP) : indispensable pour l'administration en production
 * (le moteur exige une session aal2), recommandee pour tous. Aucun secret ne passe par notre serveur :
 * l'enrolement se fait directement avec Supabase Auth.
 */
export default function MfaScreen() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Application d'authentification",
      });
      if (error || !data) {
        Alert.alert("Activation impossible", error?.message ?? "Réessayez.");
        return;
      }
      setEnrolling({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri });
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (challenge.error || !challenge.data) {
        Alert.alert("Vérification impossible", challenge.error?.message ?? "Réessayez.");
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) {
        Alert.alert("Code incorrect", "Vérifiez le code affiché dans votre application.");
        return;
      }
      setEnrolling(null);
      setCode("");
      await load();
      Alert.alert("Double authentification activée", "Elle vous sera demandée à chaque connexion.");
    } finally {
      setBusy(false);
    }
  };

  const unenroll = (factorId: string) =>
    Alert.alert("Désactiver la double authentification ?", "Votre compte sera moins protégé.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Désactiver",
        style: "destructive",
        onPress: () => {
          void supabase.auth.mfa.unenroll({ factorId }).then(({ error }) => {
            if (error) Alert.alert("Impossible", error.message);
            void load();
          });
        },
      },
    ]);

  const verified = factors?.filter((f) => f.status === "verified") ?? [];

  return (
    <Screen title="Double authentification" back>
      <Text variant="sm" tone="muted">
        Un code à six chiffres, généré par une application d'authentification (Apple Mots de passe,
        Google Authenticator, 1Password…), en plus de votre mot de passe.
      </Text>
      {factors === null ? <ActivityIndicator color={theme.colors.accent} /> : null}

      {verified.length > 0 ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <ShieldCheck size={22} color={theme.colors.success} />
            <Text variant="bodyStrong">Activée</Text>
            <Badge label="Protégé" tone="success" />
          </View>
          {verified.map((f) => (
            <Button
              key={f.id}
              label="Désactiver"
              variant="ghost"
              size="sm"
              onPress={() => unenroll(f.id)}
            />
          ))}
        </Card>
      ) : null}

      {factors !== null && verified.length === 0 && !enrolling ? (
        <Button
          label="Activer la double authentification"
          icon={<KeyRound size={18} color="#ffffff" />}
          loading={busy}
          onPress={() => void startEnroll()}
        />
      ) : null}

      {enrolling ? (
        <Card style={styles.card}>
          <Text variant="bodyStrong">1. Ajoutez le compte dans votre application</Text>
          <Button
            label="Ouvrir mon application d'authentification"
            variant="ghost"
            size="sm"
            onPress={() => void Linking.openURL(enrolling.uri)}
          />
          <Text variant="small" tone="muted">
            Ou saisissez cette clé à la main :
          </Text>
          <Text variant="smStrong" selectable style={styles.secret}>
            {enrolling.secret.replace(/(.{4})/g, "$1 ").trim()}
          </Text>
          <Text variant="bodyStrong">2. Entrez le code affiché</Text>
          <Input
            label="Code à 6 chiffres"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
          />
          <Button
            label="Confirmer"
            disabled={code.length !== 6}
            loading={busy}
            onPress={() => void confirmEnroll()}
          />
          <Button label="Annuler" variant="ghost" size="sm" onPress={() => setEnrolling(null)} />
        </Card>
      ) : null}
      <Button label="Retour" variant="ghost" size="sm" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.space["3"] },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  secret: { letterSpacing: 1 },
});
