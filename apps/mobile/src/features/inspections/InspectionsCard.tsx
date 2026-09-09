import { useRouter } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";
import { ClipboardCheck, FileText } from "lucide-react-native";

import { Button, Card, ListItem, Text } from "@/components/ui";
import { formatDateTime } from "@/features/client/booking-labels";
import { useInspections } from "@/lib/queries-inspections";
import { theme } from "@/theme";

/** Etats des lieux d'une reservation : liste des PDF signes, et le bouton pour en faire un (cote loueur). */
export function InspectionsCard({
  bookingId,
  organizationId,
  canCreate,
}: {
  bookingId: string;
  organizationId?: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const inspections = useInspections(bookingId);
  const items = inspections.data?.inspections ?? [];
  if (!canCreate && items.length === 0) return null;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <ClipboardCheck size={20} color={theme.colors.accentTint} />
        <Text variant="bodyStrong">États des lieux</Text>
      </View>
      {items.length === 0 ? (
        <Text variant="sm" tone="muted">
          Aucun état des lieux pour l'instant.
        </Text>
      ) : (
        <Card padded={false}>
          {items.map((i, index) => (
            <ListItem
              key={i.id}
              icon={<FileText size={20} color={theme.colors.text} />}
              title={i.kind === "departure" ? "Départ" : "Retour"}
              subtitle={`${formatDateTime(i.createdAt)} · ${i.damages.length} dommage${i.damages.length > 1 ? "s" : ""}${i.sentAt ? " · envoyé" : ""}`}
              onPress={i.pdfUrl ? () => void Linking.openURL(i.pdfUrl!) : undefined}
              last={index === items.length - 1}
            />
          ))}
        </Card>
      )}
      {canCreate && organizationId ? (
        <Button
          label="Faire un état des lieux"
          variant="ghost"
          size="sm"
          icon={<ClipboardCheck size={18} color={theme.colors.text} />}
          onPress={() =>
            router.push(`/(pro)/organizations/${organizationId}/bookings/${bookingId}/inspection`)
          }
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.space["3"] },
  head: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
});
