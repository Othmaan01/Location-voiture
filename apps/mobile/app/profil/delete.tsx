import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Card, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useDeleteAccount } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

/** Suppression de compte dans l'app (exigence Apple / Google), avec confirmation explicite. */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const remove = useDeleteAccount();
  const [confirmation, setConfirmation] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const onDelete = async () => {
    setServerError(null);
    try {
      await remove.mutateAsync();
      await supabase.auth.signOut({ scope: "local" });
      router.dismissAll();
    } catch (error) {
      setServerError(
        error instanceof ApiRequestError && error.status === 409
          ? error.message
          : "Suppression impossible pour le moment. Réessayez.",
      );
    }
  };

  return (
    <Screen title="Supprimer mon compte" back>
      <Card>
        <View style={styles.stack}>
          <Text variant="bodyStrong">Cette action est définitive.</Text>
          <Text variant="sm" tone="muted">
            Votre compte, vos favoris et vos appareils sont supprimés. Vos réservations passées sont
            conservées de façon anonyme pour les obligations comptables des loueurs.
          </Text>
          <Text variant="sm" tone="muted">
            Si vous êtes propriétaire d'une organisation avec d'autres membres, transférez d'abord
            la propriété.
          </Text>
        </View>
      </Card>
      <Input
        label='Tapez "SUPPRIMER" pour confirmer'
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {serverError ? (
        <Text variant="sm" tone="danger">
          {serverError}
        </Text>
      ) : null}
      <Button
        label="Supprimer définitivement"
        variant="danger"
        disabled={confirmation !== "SUPPRIMER"}
        loading={remove.isPending}
        onPress={() => void onDelete()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: theme.space["2"] } });
