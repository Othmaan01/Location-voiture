import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Building2 } from "lucide-react-native";
import type { OrganizationStatus } from "@lv/contracts";

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
import { ORG_STATUS } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useAdminOrganizations, useAdminSuspendOrganization, useMe } from "@/lib/queries";
import { theme } from "@/theme";

const FILTERS: { key: OrganizationStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "verified", label: "Vérifiés" },
  { key: "submitted", label: "En attente" },
  { key: "draft", label: "Brouillons" },
  { key: "suspended", label: "Suspendus" },
];

/** Administration : tous les loueurs, leur etat, leur volume ; suspension motivee. */
export default function AdminLoueursTab() {
  const me = useMe();
  const [filter, setFilter] = useState<OrganizationStatus | "all">("all");
  const [q, setQ] = useState("");
  const list = useAdminOrganizations(!!me.data?.platformRole, {
    ...(filter === "all" ? {} : { status: filter }),
    ...(q.trim().length >= 2 ? { q: q.trim() } : {}),
  });
  const suspend = useAdminSuspendOrganization();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const act = (organizationId: string, on: boolean) =>
    suspend.mutate(
      { organizationId, suspend: on, ...(on ? { reason } : {}) },
      {
        onSuccess: () => {
          setTarget(null);
          setReason("");
        },
        onError: (e) =>
          Alert.alert("Action refusée", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );

  return (
    <Screen eyebrow="Administration" title="Loueurs" dock>
      <Input
        label="Rechercher"
        placeholder="Nom, raison sociale ou SIREN"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === f.key }}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key ? styles.chipOn : null]}
          >
            <Text variant="smStrong" tone={filter === f.key ? "inverse" : "default"}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {list.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {list.data && list.data.items.length === 0 ? <EmptyState title="Aucun loueur" /> : null}
      {list.data && list.data.items.length > 0 ? (
        <Card padded={false}>
          {list.data.items.map((o, i) => {
            const s = ORG_STATUS[o.status] ?? ORG_STATUS["draft"]!;
            return (
              <ListItem
                key={o.id}
                icon={<Building2 size={22} color={theme.colors.text} />}
                title={o.name}
                subtitle={`${o.siren ? `SIREN ${o.siren} · ` : ""}${o.publishedCount}/${o.vehicleCount} publié${o.publishedCount > 1 ? "s" : ""} · ${o.agencyCount} agence${o.agencyCount > 1 ? "s" : ""} · ${o.planCode}`}
                right={<Badge label={s.label} tone={s.tone} />}
                onPress={() =>
                  o.status === "suspended"
                    ? Alert.alert("Lever la suspension ?", o.name, [
                        { text: "Annuler", style: "cancel" },
                        { text: "Réactiver", onPress: () => act(o.id, false) },
                      ])
                    : setTarget({ id: o.id, name: o.name })
                }
                last={i === list.data.items.length - 1}
              />
            );
          })}
        </Card>
      ) : null}

      <Sheet visible={target !== null} onClose={() => setTarget(null)} title={target?.name ?? ""}>
        <Text variant="sm" tone="muted">
          Suspendre retire immédiatement le loueur et ses véhicules de l'application. Le motif lui
          est montré.
        </Text>
        <Input
          label="Motif de la suspension"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />
        <Button
          label="Suspendre"
          variant="danger"
          disabled={reason.trim().length < 3}
          loading={suspend.isPending}
          onPress={() => target && act(target.id, true)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  chip: {
    paddingHorizontal: theme.space["3"],
    minHeight: 36,
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
});
