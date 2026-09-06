import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Flag, Scale } from "lucide-react-native";

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
import { formatDate } from "@/features/client/booking-labels";
import { useMe } from "@/lib/queries";
import { useAdminDisputes, useAdminReports, useResolveReport } from "@/lib/queries-reports";
import { theme } from "@/theme";

const REASON_LABEL: Record<string, string> = {
  fraud: "Arnaque",
  inappropriate: "Inapproprié",
  spam: "Spam",
  safety: "Sécurité",
  other: "Autre",
};
const TARGET_LABEL: Record<string, string> = {
  organization: "Loueur",
  vehicle: "Véhicule",
  review: "Avis",
  conversation: "Conversation",
};

/** Administration : signalements a traiter et litiges ouverts (ADR-0013). */
export default function AdminReportsTab() {
  const me = useMe();
  const router = useRouter();
  const enabled = !!me.data?.platformRole;
  const [section, setSection] = useState<"reports" | "disputes">("reports");
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed">("open");
  const reports = useAdminReports(enabled && section === "reports", status);
  const disputes = useAdminDisputes(enabled && section === "disputes");
  const resolve = useResolveReport();
  const [target, setTarget] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const decide = (reportId: string, decision: "resolved" | "dismissed") =>
    resolve.mutate(
      { reportId, status: decision, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => {
          setTarget(null);
          setNote("");
        },
        onError: () => Alert.alert("Action refusée", "Réessayez."),
      },
    );

  return (
    <Screen eyebrow="Administration" title="Signalements" dock>
      <View style={styles.chips}>
        {(
          [
            { key: "reports", label: "Signalements" },
            { key: "disputes", label: "Litiges" },
          ] as const
        ).map((s) => (
          <Pressable
            key={s.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s.key }}
            onPress={() => setSection(s.key)}
            style={[styles.chip, section === s.key ? styles.chipOn : null]}
          >
            <Text variant="smStrong" tone={section === s.key ? "inverse" : "default"}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === "reports" ? (
        <>
          <View style={styles.chips}>
            {(["open", "resolved", "dismissed"] as const).map((s) => (
              <Pressable
                key={s}
                accessibilityRole="tab"
                accessibilityState={{ selected: status === s }}
                onPress={() => setStatus(s)}
                style={[styles.chipSmall, status === s ? styles.chipOn : null]}
              >
                <Text variant="small" tone={status === s ? "inverse" : "muted"}>
                  {s === "open" ? "À traiter" : s === "resolved" ? "Traités" : "Classés"}
                </Text>
              </Pressable>
            ))}
          </View>
          {reports.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
          {reports.data && reports.data.reports.length === 0 ? (
            <EmptyState title="Aucun signalement" />
          ) : null}
          {reports.data && reports.data.reports.length > 0 ? (
            <Card padded={false}>
              {reports.data.reports.map((r, i) => (
                <ListItem
                  key={r.id}
                  icon={<Flag size={20} color={theme.colors.accentTint} />}
                  title={`${TARGET_LABEL[r.targetType] ?? r.targetType} · ${REASON_LABEL[r.reason] ?? r.reason}`}
                  subtitle={`${r.organizationName ?? "—"} · par ${r.reporterName} · ${formatDate(r.createdAt)}${r.details ? `\n${r.details}` : ""}`}
                  right={
                    <Badge
                      label={
                        r.status === "open"
                          ? "Ouvert"
                          : r.status === "resolved"
                            ? "Traité"
                            : "Classé"
                      }
                      tone={r.status === "open" ? "warning" : "neutral"}
                    />
                  }
                  onPress={r.status === "open" ? () => setTarget(r.id) : undefined}
                  last={i === reports.data.reports.length - 1}
                />
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {disputes.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
          {disputes.data && disputes.data.bookings.length === 0 ? (
            <EmptyState title="Aucun litige ouvert" />
          ) : null}
          {disputes.data && disputes.data.bookings.length > 0 ? (
            <Card padded={false}>
              {disputes.data.bookings.map((b, i) => (
                <ListItem
                  key={b.id}
                  icon={<Scale size={20} color={theme.colors.accentTint} />}
                  title={`${b.reference} · ${b.vehicle.brand} ${b.vehicle.model}`}
                  subtitle={`${b.loueurName} · ${formatDate(b.from)} → ${formatDate(b.to)}`}
                  right={<Badge label="Litige" tone="accent" />}
                  onPress={() => router.push(`/reservations/${b.id}`)}
                  last={i === disputes.data.bookings.length - 1}
                />
              ))}
            </Card>
          ) : null}
          <Text variant="small" tone="dim">
            Ouvrez une réservation pour lire l'historique et clore le litige avec une décision
            motivée.
          </Text>
        </>
      )}

      <Sheet
        visible={target !== null}
        onClose={() => setTarget(null)}
        title="Traiter le signalement"
      >
        <Input
          label="Note interne (optionnel)"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
        <View style={styles.row}>
          <Button
            label="Classer"
            variant="ghost"
            style={styles.flex}
            loading={resolve.isPending}
            onPress={() => target && decide(target, "dismissed")}
          />
          <Button
            label="Traité"
            style={styles.flex}
            loading={resolve.isPending}
            onPress={() => target && decide(target, "resolved")}
          />
        </View>
        <Text variant="small" tone="dim">
          Pour suspendre un loueur ou masquer un avis, passez par l'onglet Loueurs ou la
          réservation.
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  chip: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSmall: {
    paddingHorizontal: theme.space["3"],
    minHeight: 32,
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  row: { flexDirection: "row", gap: theme.space["2"] },
  flex: { flex: 1 },
});
