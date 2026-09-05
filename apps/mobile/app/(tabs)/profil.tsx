import { useQuery } from "@tanstack/react-query";
import { MeResponseSchema } from "@lv/contracts";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { theme } from "@/theme";

/**
 * Ecran de verification de bout en bout (critere de sortie Phase 0) :
 * l'app appelle l'API avec sa session et affiche l'identite renvoyee.
 * L'authentification elle-meme (ecrans, OAuth) arrive en Phase 1.
 */
export default function ProfileScreen() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest("/v1/me", MeResponseSchema),
    retry: (count, error) =>
      !(error instanceof ApiRequestError && error.status === 401) && count < 2,
  });

  return (
    <Screen title="Profil">
      {me.isPending ? <ActivityIndicator color={theme.colors.brand} /> : null}
      {me.isError && me.error instanceof ApiRequestError && me.error.status === 401 ? (
        <EmptyState title="Non connecté" description="La connexion arrive en Phase 1." />
      ) : null}
      {me.isError && !(me.error instanceof ApiRequestError && me.error.status === 401) ? (
        <EmptyState
          title="Impossible de joindre le serveur"
          description="Vérifiez votre connexion puis réessayez."
        />
      ) : null}
      {me.data ? (
        <View style={styles.card}>
          <Text style={styles.label}>Connecté en tant que</Text>
          <Text style={styles.value}>{me.data.email ?? me.data.userId}</Text>
          <Text style={styles.label}>Organisations</Text>
          <Text style={styles.value}>{me.data.memberships.length}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space["4"],
    gap: theme.space["1"],
  },
  label: { fontSize: theme.font.size.sm, color: theme.colors.textMuted },
  value: {
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    fontWeight: theme.font.weight.medium,
    marginBottom: theme.space["2"],
  },
});
