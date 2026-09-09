import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Trash2 } from "lucide-react-native";

import { Badge, Button, Screen, Text } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { celebrate } from "@/lib/celebrate";
import { ApiRequestError } from "@/lib/api";
import { useOrganization } from "@/lib/queries";
import {
  useAgencies,
  useAgencyPhotoUploadUrl,
  useConfirmAgencyPhoto,
  useDeleteAgency,
  useUpdateAgency,
} from "@/lib/queries-catalog";
import { UploadError, pickAndPrepareImage, uploadToSignedUrl } from "@/lib/upload";
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
  const photoUrl = useAgencyPhotoUploadUrl(agencyId);
  const confirmPhoto = useConfirmAgencyPhoto(organizationId, agencyId);
  const [uploading, setUploading] = useState(false);
  const agency = agencies.data?.agencies.find((a) => a.id === agencyId);

  const changePhoto = async () => {
    try {
      const picked = await pickAndPrepareImage();
      if (!picked) return;
      setUploading(true);
      const signed = await photoUrl.mutateAsync({
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirmPhoto.mutateAsync({ path: signed.path });
    } catch (e) {
      Alert.alert(
        "Photo non enregistrée",
        e instanceof ApiRequestError || e instanceof UploadError
          ? e.message
          : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Changer la photo de l'agence"
        onPress={() => void changePhoto()}
        style={styles.photo}
      >
        {agency.photoUrl ? (
          <Image source={{ uri: agency.photoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Camera size={24} color={theme.colors.textDim} />
            <Text variant="small" tone="muted">
              {uploading ? "Envoi en cours…" : "Ajouter une photo de l'agence"}
            </Text>
          </View>
        )}
      </Pressable>
      <AgencyForm
        initial={agency}
        siren={org.data?.siren ?? null}
        submitting={update.isPending}
        onSubmit={async (input) => {
          const updated = await update.mutateAsync({ agencyId, body: input });
          if (updated.status === "published" && agency.status !== "published")
            celebrate("Agence en ligne", "Vous pouvez publier vos véhicules.");
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

const styles = StyleSheet.create({
  photo: { height: 140, borderRadius: theme.radius.card, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  photoEmpty: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space["1"],
  },
});
