import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert } from "react-native";
import { Trash2 } from "lucide-react-native";

import { Badge, Button, Screen, Text } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { ApiRequestError } from "@/lib/api";
import { useOrganization } from "@/lib/queries";
import { useAgencies, useDeleteAgency, useUpdateAgency } from "@/lib/queries-catalog";
import { theme } from "@/theme";

/** Une agence devient visible d'elle-meme des que SIRET et adresse sont renseignes ; aucune etape de publication. */
export default function EditAgencyScreen() {
  const { organizationId, agencyId } = useLocalSearchParams<{
    organizationId: string;
    agencyId: string;
  }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  const org = useOrganization(organizationId);
  const update = useUpdateAgency(organizationId);
  const remove = useDeleteAgency(organizationId);
  const agency = agencies.data?.agencies.find((a) => a.id === agencyId);

  const confirmDelete = () =>
    Alert.alert(
      "Supprimer cette agence ?",
      "Refusé si des véhicules y sont rattachés : supprimez-les ou déplacez-les d'abord.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            remove.mutate(agencyId, {
              onSuccess: () => router.back(),
              onError: (e) =>
                Alert.alert(
                  "Suppression impossible",
                  e instanceof ApiRequestError ? e.message : "Réessayez.",
                ),
            }),
        },
      ],
    );

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
                : agency.siret
                  ? "Adresse à positionner"
                  : "SIRET à renseigner"
          }
          tone={agency.status === "suspended" ? "accent" : visible ? "success" : "warning"}
        />
      }
    >
      <AgencyForm
        initial={agency}
        siren={org.data?.siren ?? null}
        submitting={update.isPending}
        onSubmit={async (input) => {
          await update.mutateAsync({ agencyId, body: input });
          router.back();
        }}
      />
      <Text variant="small" tone="dim">
        {visible
          ? "Cette agence apparaît aux clients dès que votre organisation est vérifiée et qu'un véhicule y est publié."
          : "Renseignez le SIRET et choisissez une adresse dans les suggestions : l'agence deviendra visible automatiquement."}
      </Text>
      <Button
        label="Supprimer l'agence"
        variant="danger"
        icon={<Trash2 size={18} color={theme.colors.danger} />}
        loading={remove.isPending}
        onPress={confirmDelete}
      />
    </Screen>
  );
}
