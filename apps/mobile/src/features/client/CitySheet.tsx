import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LocateFixed } from "lucide-react-native";
import * as Location from "expo-location";

import { Input, Sheet, Text } from "@/components/ui";
import { useCities } from "@/lib/queries-public";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPickCity: (slug: string, name: string) => void;
  onPickLocation: (origin: { lat: number; lng: number }) => void;
}

/** Choix du lieu : une ville de reference, ou la position actuelle, demandee seulement ici (brief § 24). */
export function CitySheet({ visible, onClose, onPickCity, onPickLocation }: Props) {
  const cities = useCities();
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const filtered = (cities.data?.cities ?? []).filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );

  const locate = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onPickLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } finally {
      setLocating(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Où ?">
      <Pressable accessibilityRole="button" onPress={() => void locate()} style={styles.locate}>
        <LocateFixed size={20} color={theme.colors.accentTint} />
        <Text variant="smStrong" tone="accent">
          {locating ? "Localisation…" : "Autour de moi"}
        </Text>
      </Pressable>
      <Input
        label="Ville"
        value={q}
        onChangeText={setQ}
        placeholder="Lyon, Paris…"
        autoCorrect={false}
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {filtered.map((c, i) => (
          <Pressable
            key={c.slug}
            accessibilityRole="button"
            onPress={() => onPickCity(c.slug, c.name)}
            style={[styles.row, i < filtered.length - 1 ? styles.rowBorder : null]}
          >
            <Text variant="sm">{c.name}</Text>
            {c.departmentCode ? (
              <Text variant="small" tone="muted">
                {c.departmentCode}
              </Text>
            ) : null}
          </Pressable>
        ))}
        {cities.data && filtered.length === 0 ? (
          <View style={styles.row}>
            <Text variant="sm" tone="muted">
              Aucune ville. D'autres villes seront ajoutées avec les premières agences.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  locate: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["2"],
    minHeight: 48,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.accentSoft,
  },
  list: { maxHeight: 280 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: theme.space["1"],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});
