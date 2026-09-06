import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { Badge, Screen, Text } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { useAgencies, useUpdateAgency } from "@/lib/queries-catalog";
import { theme } from "@/theme";

/** Une agence devient visible d'elle-meme des que son adresse est positionnee ; aucune etape de publication. */
export default function EditAgencyScreen() {
  const { organizationId, agencyId } = useLocalSearchParams<{
    organizationId: string;
    agencyId: string;
  }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  const update = useUpdateAgency(organizationId);
  const agency = agencies.data?.agencies.find((a) => a.id === agencyId);

  if (!agency) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  const visible = agency.status === "published";
  return (
    <Screen
      title={agency.name}
      back
      headerRight={
        <Badge
          label={
            agency.status === "suspended"
              ? "Suspendue"
              : visible
                ? "Visible"
                : "Adresse à positionner"
          }
          tone={agency.status === "suspended" ? "accent" : visible ? "success" : "warning"}
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
      <Text variant="small" tone="dim">
        {visible
          ? "Cette agence apparaît aux clients dès que votre organisation est vérifiée et qu'un véhicule y est publié."
          : "Choisissez une adresse dans les suggestions pour positionner l'agence : elle deviendra visible automatiquement."}
      </Text>
    </Screen>
  );
}
