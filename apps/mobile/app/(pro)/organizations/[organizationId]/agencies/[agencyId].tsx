import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { Badge, Button, Screen, Text } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { ApiRequestError } from "@/lib/api";
import { useAgencies, useSetAgencyPublished, useUpdateAgency } from "@/lib/queries-catalog";
import { theme } from "@/theme";

export default function EditAgencyScreen() {
  const { organizationId, agencyId } = useLocalSearchParams<{
    organizationId: string;
    agencyId: string;
  }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  const update = useUpdateAgency(organizationId);
  const publish = useSetAgencyPublished(organizationId);
  const agency = agencies.data?.agencies.find((a) => a.id === agencyId);

  if (!agency) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  const toggle = () =>
    publish.mutate(
      { agencyId, published: agency.status !== "published" },
      {
        onError: (e) =>
          Alert.alert(
            "Publication impossible",
            e instanceof ApiRequestError ? e.message : "Réessayez plus tard.",
          ),
      },
    );

  return (
    <Screen
      title={agency.name}
      back
      headerRight={
        <Badge
          label={agency.status === "published" ? "Publiée" : "Brouillon"}
          tone={agency.status === "published" ? "success" : "neutral"}
        />
      }
    >
      <AgencyForm
        initial={agency}
        submitting={update.isPending}
        onSubmit={async (input) => {
          await update.mutateAsync({ agencyId, body: input });
          router.back();
        }}
      />
      <View style={styles.publish}>
        <Text variant="small" tone="dim">
          {agency.status === "published"
            ? "Visible des clients. Dépublier la retire de la carte sans rien supprimer."
            : "Publication possible une fois l'organisation vérifiée et l'adresse positionnée."}
        </Text>
        <Button
          label={agency.status === "published" ? "Dépublier l'agence" : "Publier l'agence"}
          variant="ghost"
          loading={publish.isPending}
          onPress={toggle}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  publish: { gap: theme.space["2"], marginTop: theme.space["2"] },
});
