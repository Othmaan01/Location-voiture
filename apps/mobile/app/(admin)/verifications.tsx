import { useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { FileText } from "lucide-react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  ListItem,
  Screen,
  Sheet,
  Text,
} from "@/components/ui";
import { DOCUMENT_KIND_LABEL } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { useAdminDecide, useAdminQueue, useDocumentReadUrl } from "@/lib/queries-catalog";
import { theme } from "@/theme";

/** File de verification des loueurs : documents, decision, motif de refus. */
export default function VerificationsScreen() {
  const me = useMe();
  const queue = useAdminQueue(!!me.data?.platformRole);
  const decide = useAdminDecide();
  const readUrl = useDocumentReadUrl();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const act = (organizationId: string, decision: "verified" | "rejected") =>
    decide.mutate(
      { organizationId, decision, ...(decision === "rejected" ? { reason } : {}) },
      {
        onSuccess: () => {
          setRejecting(null);
          setReason("");
        },
        onError: (e) =>
          Alert.alert("Décision refusée", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );

  return (
    <Screen eyebrow="Administration" title="Vérifications" back>
      {queue.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {queue.isError ? (
        <EmptyState
          title="File inaccessible"
          description={
            queue.error instanceof ApiRequestError
              ? queue.error.message
              : "Vérifiez votre connexion et réessayez."
          }
          action={<Button label="Réessayer" variant="ghost" onPress={() => queue.refetch()} />}
        />
      ) : null}
      {queue.data && queue.data.items.length === 0 ? (
        <EmptyState
          title="Rien à vérifier"
          description="Les dossiers soumis par les loueurs apparaîtront ici."
        />
      ) : null}
      {queue.data?.items.map((item) => (
        <Card key={item.organizationId} style={styles.item}>
          <View style={styles.head}>
            <View style={styles.headTexts}>
              <Text variant="bodyStrong">{item.organizationName}</Text>
              <Text variant="small" tone="muted">
                {item.siret ? `SIRET ${item.siret} · ` : ""}soumis le{" "}
                {new Date(item.submittedAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
            <Badge label={item.documents.length + " doc."} tone="neutral" />
          </View>
          <Card padded={false} raised>
            {item.documents.map((d, i) => (
              <ListItem
                key={d.id}
                icon={<FileText size={20} color={theme.colors.text} />}
                title={DOCUMENT_KIND_LABEL[d.kind] ?? d.kind}
                subtitle={d.mimeType}
                onPress={() =>
                  readUrl.mutate(d.id, { onSuccess: (r) => void Linking.openURL(r.url) })
                }
                last={i === item.documents.length - 1}
              />
            ))}
          </Card>
          <View style={styles.actions}>
            <Button
              label="Refuser"
              variant="ghost"
              style={styles.flex}
              onPress={() => setRejecting(item.organizationId)}
            />
            <Button
              label="Vérifier"
              style={styles.flex2}
              loading={decide.isPending}
              onPress={() => act(item.organizationId, "verified")}
            />
          </View>
        </Card>
      ))}

      <Sheet visible={rejecting !== null} onClose={() => setRejecting(null)} title="Motif du refus">
        <Input
          label="Motif montré au loueur"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          placeholder="Ex. : Kbis de plus de 3 mois"
        />
        <Button
          label="Confirmer le refus"
          variant="danger"
          disabled={reason.trim().length < 3}
          loading={decide.isPending}
          onPress={() => rejecting && act(rejecting, "rejected")}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { gap: theme.space["3"] },
  head: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  headTexts: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", gap: theme.space["2"] },
  flex: { flex: 1 },
  flex2: { flex: 2 },
});
