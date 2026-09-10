import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, View, type ColorValue } from "react-native";
import { Camera } from "lucide-react-native";
import { z } from "zod";
import { AccentSchema, type Accent } from "@lv/contracts";

import { Avatar, Button, Card, Input, Screen, Text } from "@/components/ui";
import { ACCENT_COLOR } from "@/features/client/accent";
import { ApiRequestError } from "@/lib/api";
import {
  useBrandingUploadUrl,
  useConfirmBranding,
  useOrganization,
  useUpdateOrganization,
} from "@/lib/queries";
import { UploadError, pickAndPrepareImage, uploadToSignedUrl } from "@/lib/upload";
import { theme } from "@/theme";

const Schema = z.object({
  bio: z.string().trim().max(600, "600 caractères maximum"),
  website: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^https?:\/\/[^\s]+$/, "Commencez par https://"),
  ]),
  accent: AccentSchema,
});
type Form = z.infer<typeof Schema>;

/** Accents autorises (ADR-0011) : quelques teintes, jamais une palette libre, pour garder le mode nuit premium. */
const ACCENTS: { value: Accent; label: string; color: ColorValue }[] = [
  { value: "red", label: "Rouge", color: ACCENT_COLOR.red },
  { value: "gold", label: "Or", color: ACCENT_COLOR.gold },
  { value: "blue", label: "Bleu", color: ACCENT_COLOR.blue },
  { value: "green", label: "Vert", color: ACCENT_COLOR.green },
];

/**
 * Apparence de l'espace pro : logo, presentation, site, accent. Visible sur le profil public.
 * Plus de banniere : le profil ne l'affiche plus (retour fondateur, 2026-09-10) ; l'API la conserve.
 */
export default function BrandingScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const org = useOrganization(organizationId);
  const update = useUpdateOrganization(organizationId);
  const uploadUrl = useBrandingUploadUrl(organizationId);
  const confirm = useConfirmBranding(organizationId);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { bio: "", website: "", accent: "red" },
  });

  useEffect(() => {
    if (org.data)
      reset({
        bio: org.data.bio ?? "",
        website: org.data.website ?? "",
        accent: org.data.accent,
      });
  }, [org.data, reset]);

  const pick = async () => {
    const kind = "logo" as const;
    try {
      const picked = await pickAndPrepareImage();
      if (!picked) return;
      setUploading(true);
      const signed = await uploadUrl.mutateAsync({
        kind,
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirm.mutateAsync({ kind, path: signed.path });
    } catch (e) {
      Alert.alert(
        "Image non enregistrée",
        e instanceof ApiRequestError || e instanceof UploadError
          ? e.message
          : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await update.mutateAsync({
        bio: v.bio || null,
        website: v.website || null,
        accent: v.accent,
      });
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "Enregistrement impossible.");
    }
  });

  return (
    <Screen title="Apparence" back>
      <Text variant="sm" tone="muted">
        Ce que les clients voient sur votre profil : votre image, votre présentation, votre couleur.
      </Text>

      <View style={styles.logoBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer le logo"
          onPress={() => void pick()}
          style={styles.logoWrap}
        >
          <Avatar name={org.data?.name ?? ""} uri={org.data?.logoUrl ?? null} size={96} />
          <View style={styles.camera}>
            <Camera size={16} color="#ffffff" strokeWidth={2.5} />
          </View>
        </Pressable>
        <Button
          label="Changer le logo"
          variant="ghost"
          size="sm"
          loading={uploading}
          onPress={() => void pick()}
        />
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <Input
              label="Présentation"
              hint="Qui vous êtes, ce que vous proposez, vos conditions. 600 caractères maximum."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              multiline
              numberOfLines={5}
            />
          )}
        />
        <Controller
          control={control}
          name="website"
          render={({ field, fieldState }) => (
            <Input
              label="Site web (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
            />
          )}
        />
        <Controller
          control={control}
          name="accent"
          render={({ field }) => (
            <Card style={styles.accents}>
              <Text variant="bodyStrong">Couleur d'accent</Text>
              <View style={styles.swatches}>
                {ACCENTS.map((a) => (
                  <Pressable
                    key={a.value}
                    accessibilityRole="radio"
                    accessibilityLabel={a.label}
                    accessibilityState={{ selected: field.value === a.value }}
                    onPress={() => field.onChange(a.value)}
                    style={[
                      styles.swatch,
                      { backgroundColor: a.color },
                      field.value === a.value ? styles.swatchOn : null,
                    ]}
                  />
                ))}
              </View>
            </Card>
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Button
          label="Enregistrer"
          loading={update.isPending || formState.isSubmitting}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoBlock: { alignItems: "center", gap: theme.space["3"] },
  logoWrap: { alignSelf: "center" },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: theme.space["4"] },
  accents: { gap: theme.space["3"] },
  swatches: { flexDirection: "row", gap: theme.space["3"] },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchOn: { borderColor: theme.colors.text },
});
