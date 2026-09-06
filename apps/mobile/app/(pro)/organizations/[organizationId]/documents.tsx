import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { ChevronRight, FileText, Plus } from "lucide-react-native";

import { Badge, Button, Card, ListItem, Screen, Select, Sheet, Text } from "@/components/ui";
import { DOCUMENT_KIND_LABEL, ORG_STATUS } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useMe } from "@/lib/queries";
import {
  useConfirmDocument,
  useDeleteDocument,
  useDocumentReadUrl,
  useDocumentUploadUrl,
  useDocuments,
  useSubmitVerification,
  useVerification,
} from "@/lib/queries-catalog";
import { UploadError, pickDocument, uploadToSignedUrl } from "@/lib/upload";
import { theme } from "@/theme";

type Kind = "kbis" | "insurance" | "id_card" | "other";
const KIND_OPTIONS = [
  {
    value: "kbis" as const,
    label: DOCUMENT_KIND_LABEL["kbis"]!,
    hint: "Obligatoire, de moins de 3 mois",
  },
  { value: "insurance" as const, label: DOCUMENT_KIND_LABEL["insurance"]!, hint: "Obligatoire" },
  { value: "id_card" as const, label: DOCUMENT_KIND_LABEL["id_card"]!, hint: "Sur demande" },
  { value: "other" as const, label: DOCUMENT_KIND_LABEL["other"]!, hint: "" },
];
/** Chaque manque renvoie vers l'ecran ou il se corrige : on ne laisse jamais un blocage sans issue. */
const MISSING_LABEL: Record<string, { title: string; hint: string }> = {
  kbis: { title: "Kbis manquant", hint: "Ajouter le document" },
  insurance: { title: "Attestation d'assurance manquante", hint: "Ajouter le document" },
  agency: {
    title: "Une agence avec SIRET et adresse positionnée",
    hint: "Compléter une agence",
  },
  siren: { title: "SIREN à renseigner", hint: "Ouvrir les informations de l'organisation" },
};
const DOC_STATUS: Record<string, { label: string; tone: "success" | "warning" | "accent" }> = {
  pending: { label: "En attente", tone: "warning" },
  accepted: { label: "Accepté", tone: "success" },
  rejected: { label: "Refusé", tone: "accent" },
};

/** Documents de verification : bucket prive, lecture par lien temporaire, soumission quand le dossier est complet. */
export default function DocumentsScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const me = useMe();
  const role = me.data?.memberships.find((m) => m.organizationId === organizationId)?.role;
  const canWrite = role === "owner" || role === "manager";
  const verification = useVerification(organizationId);
  const docs = useDocuments(organizationId, canWrite);
  const uploadUrl = useDocumentUploadUrl(organizationId);
  const confirm = useConfirmDocument(organizationId);
  const remove = useDeleteDocument(organizationId);
  const readUrl = useDocumentReadUrl();
  const submit = useSubmitVerification(organizationId);
  const [kind, setKind] = useState<Kind>("kbis");
  const [sheet, setSheet] = useState(false);
  const [uploading, setUploading] = useState(false);

  const status = verification.data ? ORG_STATUS[verification.data.status] : null;
  const missing = verification.data?.missing ?? [];
  const canSubmit =
    verification.data &&
    missing.length === 0 &&
    (verification.data.status === "draft" || verification.data.status === "rejected");

  const resolveMissing = (m: string) => {
    if (m === "siren") router.push(`/(pro)/organizations/${organizationId}/edit`);
    else if (m === "agency") router.push(`/(pro)/organizations/${organizationId}/agencies`);
    else if (m === "kbis" || m === "insurance") {
      setKind(m);
      setSheet(true);
    }
  };

  const upload = async () => {
    try {
      const picked = await pickDocument();
      if (!picked) return;
      if (picked.sizeBytes > 10_485_760) {
        Alert.alert("Fichier trop lourd", "10 Mo maximum.");
        return;
      }
      setUploading(true);
      const signed = await uploadUrl.mutateAsync({
        kind,
        mimeType: picked.mimeType,
        sizeBytes: Math.max(1, picked.sizeBytes),
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirm.mutateAsync({ path: signed.path, kind });
      setSheet(false);
    } catch (e) {
      Alert.alert(
        "Document non envoyé",
        e instanceof ApiRequestError ? e.message : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };

  const open = (id: string) =>
    readUrl.mutate(id, {
      onSuccess: (r) => void Linking.openURL(r.url),
      onError: () => Alert.alert("Lecture impossible"),
    });

  return (
    <Screen
      title="Vérification"
      back
      headerRight={
        canWrite ? (
          <Button
            label="Ajouter"
            size="sm"
            icon={<Plus size={18} color="#ffffff" />}
            onPress={() => setSheet(true)}
          />
        ) : undefined
      }
    >
      {verification.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {status ? (
        <Card style={styles.status}>
          <View style={styles.statusRow}>
            <Text variant="bodyStrong">Statut</Text>
            <Badge label={status.label} tone={status.tone} />
          </View>
          {verification.data?.statusReason ? (
            <Text variant="sm" tone="danger">
              {verification.data.statusReason}
            </Text>
          ) : null}
          {missing.length > 0 ? (
            <View style={styles.missing}>
              <Text variant="sm" tone="muted">
                Avant de soumettre :
              </Text>
              <Card padded={false} raised>
                {missing.map((m, i) => (
                  <ListItem
                    key={m}
                    title={MISSING_LABEL[m]?.title ?? m}
                    subtitle={MISSING_LABEL[m]?.hint}
                    right={<ChevronRight size={18} color={theme.colors.textDim} />}
                    onPress={canWrite ? () => resolveMissing(m) : undefined}
                    last={i === missing.length - 1}
                  />
                ))}
              </Card>
            </View>
          ) : null}
          {canSubmit ? (
            <Button
              label="Soumettre le dossier"
              loading={submit.isPending}
              onPress={() =>
                submit.mutate(undefined, {
                  onError: (e) =>
                    Alert.alert(
                      "Envoi impossible",
                      e instanceof ApiRequestError ? e.message : "Réessayez.",
                    ),
                })
              }
            />
          ) : null}
          {verification.data?.status === "submitted" ||
          verification.data?.status === "under_review" ? (
            <Text variant="sm" tone="muted">
              Nous vérifions votre dossier, généralement sous 48 h. Vous pouvez préparer vos
              véhicules en attendant.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {docs.data && docs.data.documents.length > 0 ? (
        <Card padded={false}>
          {docs.data.documents.map((d, i) => {
            const s = DOC_STATUS[d.status] ?? DOC_STATUS["pending"]!;
            return (
              <ListItem
                key={d.id}
                icon={<FileText size={22} color={theme.colors.text} />}
                title={DOCUMENT_KIND_LABEL[d.kind] ?? d.kind}
                subtitle={d.rejectionReason ?? new Date(d.createdAt).toLocaleDateString("fr-FR")}
                right={<Badge label={s.label} tone={s.tone} />}
                onPress={
                  role === "owner"
                    ? () =>
                        Alert.alert(DOCUMENT_KIND_LABEL[d.kind] ?? d.kind, undefined, [
                          { text: "Ouvrir", onPress: () => open(d.id) },
                          ...(d.status !== "accepted"
                            ? [
                                {
                                  text: "Supprimer",
                                  style: "destructive" as const,
                                  onPress: () => remove.mutate(d.id),
                                },
                              ]
                            : []),
                          { text: "Annuler", style: "cancel" as const },
                        ])
                    : undefined
                }
                last={i === docs.data.documents.length - 1}
              />
            );
          })}
        </Card>
      ) : null}
      <Text variant="small" tone="dim">
        Vos documents sont stockés de façon privée et ne sont jamais accessibles par un lien public.
        Chaque consultation est journalisée.
      </Text>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Ajouter un document">
        <Select label="Type de document" value={kind} options={KIND_OPTIONS} onChange={setKind} />
        <Text variant="small" tone="dim">
          PDF ou image, 10 Mo maximum.
        </Text>
        <Button label="Choisir le fichier" loading={uploading} onPress={() => void upload()} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: theme.space["3"] },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  missing: { gap: theme.space["2"] },
});
