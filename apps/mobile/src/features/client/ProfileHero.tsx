import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Camera, Star } from "lucide-react-native";
import type { MeResponse } from "@lv/contracts";

import { Avatar, Card, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useAvatarUploadUrl, useConfirmAvatar } from "@/lib/queries-customer-reviews";
import { UploadError, pickAndPrepareImage, uploadToSignedUrl } from "@/lib/upload";
import { theme } from "@/theme";

/**
 * En-tete de profil (ADR-0020, inspire des profils Airbnb) : grande photo, nom, et a droite
 * les chiffres qui rassurent un loueur : locations terminees, evaluations recues, anciennete.
 */
export function ProfileHero({ me, email }: { me: MeResponse; email: string | null }) {
  const uploadUrl = useAvatarUploadUrl();
  const confirm = useConfirmAvatar();
  const [busy, setBusy] = useState(false);
  const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ") || (email ?? "Mon compte");
  const since = new Date(me.memberSince).getFullYear();

  const changePhoto = async () => {
    try {
      const picked = await pickAndPrepareImage();
      if (!picked) return;
      setBusy(true);
      const signed = await uploadUrl.mutateAsync({
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirm.mutateAsync({ path: signed.path });
    } catch (e) {
      Alert.alert(
        "Photo non enregistrée",
        e instanceof ApiRequestError || e instanceof UploadError
          ? e.message
          : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card raised style={styles.card}>
      <View style={styles.left}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer la photo de profil"
          onPress={() => void changePhoto()}
          style={styles.avatarWrap}
        >
          <Avatar name={fullName} uri={me.avatarUrl} size={104} round />
          <View style={styles.camera}>
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Camera size={16} color="#ffffff" strokeWidth={2.5} />
            )}
          </View>
        </Pressable>
        <Text variant="h2" numberOfLines={1} style={styles.name}>
          {fullName}
        </Text>
        {email ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {email}
          </Text>
        ) : null}
      </View>
      <View style={styles.stats}>
        <Stat
          value={String(me.completedBookings)}
          label={me.completedBookings > 1 ? "locations" : "location"}
        />
        <View style={styles.divider} />
        <Stat
          value={
            me.ratingAverage !== null
              ? `${me.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5`
              : "—"
          }
          label={
            me.ratingCount > 0
              ? `${me.ratingCount} évaluation${me.ratingCount > 1 ? "s" : ""}`
              : "évaluation"
          }
          star={me.ratingAverage !== null}
        />
        <View style={styles.divider} />
        <Stat value={String(since)} label="membre depuis" />
      </View>
    </Card>
  );
}

function Stat({ value, label, star = false }: { value: string; label: string; star?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        <Text variant="h1">{value}</Text>
        {star ? <Star size={16} color={theme.colors.text} fill={theme.colors.text} /> : null}
      </View>
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: theme.space["4"], alignItems: "center" },
  left: { flex: 1.1, alignItems: "center", gap: 6 },
  avatarWrap: { marginBottom: theme.space["1"] },
  camera: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { textAlign: "center" },
  stats: { flex: 0.9, gap: theme.space["2"] },
  stat: { gap: 0 },
  statValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { height: 1, backgroundColor: theme.colors.border },
});
