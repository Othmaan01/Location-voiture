import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react-native";

import { Button, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import {
  useConfirmPhoto,
  useDeletePhoto,
  usePhotoUploadUrl,
  useReorderPhotos,
  useVehicle,
} from "@/lib/queries-catalog";
import { UploadError, pickAndPrepareImage, uploadToSignedUrl } from "@/lib/upload";
import { theme } from "@/theme";

/** Photos du vehicule : ajout (galerie, redimensionnee), ordre, suppression. La premiere est la vignette. */
export default function VehiclePhotosScreen() {
  const { organizationId, vehicleId } = useLocalSearchParams<{
    organizationId: string;
    vehicleId: string;
  }>();
  const vehicle = useVehicle(vehicleId);
  const uploadUrl = usePhotoUploadUrl(vehicleId);
  const confirm = useConfirmPhoto(organizationId, vehicleId);
  const reorder = useReorderPhotos(organizationId, vehicleId);
  const remove = useDeletePhoto(organizationId, vehicleId);
  const [uploading, setUploading] = useState(false);
  const photos = vehicle.data?.photos ?? [];

  const addPhoto = async () => {
    try {
      const picked = await pickAndPrepareImage();
      if (!picked) return;
      setUploading(true);
      const signed = await uploadUrl.mutateAsync({
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirm.mutateAsync({ path: signed.path, width: picked.width, height: picked.height });
    } catch (e) {
      Alert.alert(
        "Photo non ajoutée",
        e instanceof ApiRequestError ? e.message : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };

  const move = (index: number, delta: number) => {
    const ids = photos.map((p) => p.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids);
  };

  const confirmDelete = (photoId: string) =>
    Alert.alert("Supprimer cette photo ?", undefined, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(photoId) },
    ]);

  return (
    <Screen
      title="Photos"
      back
      headerRight={
        <Button
          label="Ajouter"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          loading={uploading}
          disabled={photos.length >= 30}
          onPress={() => void addPhoto()}
        />
      }
    >
      {vehicle.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      <Text variant="sm" tone="muted">
        La première photo est la vignette. Photos réduites automatiquement avant envoi.{" "}
        {photos.length} sur 30.
      </Text>
      <View style={styles.grid}>
        {photos.map((p, i) => (
          <View key={p.id} style={styles.cell}>
            <Image
              source={{ uri: p.url }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
            {i === 0 ? (
              <View style={styles.cover}>
                <Text variant="small" style={styles.coverText}>
                  Vignette
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Déplacer vers la gauche"
                disabled={i === 0}
                onPress={() => move(i, -1)}
                style={[styles.action, i === 0 ? styles.actionOff : null]}
              >
                <ArrowLeft size={16} color={theme.colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Déplacer vers la droite"
                disabled={i === photos.length - 1}
                onPress={() => move(i, 1)}
                style={[styles.action, i === photos.length - 1 ? styles.actionOff : null]}
              >
                <ArrowRight size={16} color={theme.colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Supprimer"
                onPress={() => confirmDelete(p.id)}
                style={[styles.action, styles.actionDanger]}
              >
                <Trash2 size={16} color={theme.colors.danger} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      {photos.length === 0 && !vehicle.isPending ? (
        <Button label="Ajouter une photo" loading={uploading} onPress={() => void addPhoto()} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["3"] },
  cell: { width: "47%", gap: theme.space["2"] },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceRaised,
  },
  cover: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverText: { color: "#ffffff", fontWeight: theme.font.weight.bold },
  actions: { flexDirection: "row", gap: theme.space["2"] },
  action: {
    flex: 1,
    height: 36,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actionOff: { opacity: 0.35 },
  actionDanger: { borderColor: theme.colors.accentDark },
});
