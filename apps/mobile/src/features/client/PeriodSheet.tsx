import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

import { Button, Sheet, Text } from "@/components/ui";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  from: string | null;
  to: string | null;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
}

const DAY = 24 * 3600 * 1000;
const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function at9(d: Date): Date {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
}

/**
 * Choix des dates sans calendrier complexe : un jour de depart (pas de 1 jour) et une duree.
 * Le retrait est fixe a 9 h ; l'heure exacte se regle avec le loueur (Phase 4).
 */
export function PeriodSheet({ visible, from, to, onClose, onApply }: Props) {
  const initialStart = from ? new Date(from) : at9(new Date(Date.now() + DAY));
  const initialDays =
    from && to
      ? Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY))
      : 2;
  const [start, setStart] = useState(initialStart);
  const [days, setDays] = useState(initialDays);
  const minStart = at9(new Date());
  const end = new Date(start.getTime() + days * DAY);

  const presets = [
    { label: "Demain, 2 jours", start: at9(new Date(Date.now() + DAY)), days: 2 },
    { label: "Ce week-end", start: nextSaturday(), days: 2 },
    { label: "Une semaine", start: at9(new Date(Date.now() + DAY)), days: 7 },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Vos dates">
      <View style={styles.presets}>
        {presets.map((p) => (
          <Pressable
            key={p.label}
            accessibilityRole="button"
            onPress={() => {
              setStart(p.start);
              setDays(p.days);
            }}
            style={styles.preset}
          >
            <Text variant="smStrong">{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Stepper
        label="Retrait"
        value={fmt.format(start)}
        onMinus={() =>
          setStart((s) =>
            s.getTime() - DAY >= minStart.getTime() ? new Date(s.getTime() - DAY) : s,
          )
        }
        onPlus={() => setStart((s) => new Date(s.getTime() + DAY))}
      />
      <Stepper
        label="Durée"
        value={`${days} jour${days > 1 ? "s" : ""}`}
        onMinus={() => setDays((d) => Math.max(1, d - 1))}
        onPlus={() => setDays((d) => Math.min(60, d + 1))}
      />
      <Text variant="small" tone="dim">
        Retour le {fmt.format(end)} à 9 h. L'heure précise se règle avec le loueur.
      </Text>
      <Button label="Appliquer" onPress={() => onApply(start.toISOString(), end.toISOString())} />
    </Sheet>
  );
}

function nextSaturday(): Date {
  const d = at9(new Date());
  const delta = (6 - d.getDay() + 7) % 7 || 7;
  return new Date(d.getTime() + delta * DAY);
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperTexts}>
        <Text variant="small" tone="muted">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : moins`}
        onPress={onMinus}
        style={styles.round}
      >
        <Minus size={18} color={theme.colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : plus`}
        onPress={onPlus}
        style={styles.round}
      >
        <Plus size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  preset: {
    height: 36,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: "center",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["2"],
    minHeight: 56,
    padding: theme.space["3"],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepperTexts: { flex: 1, gap: 2 },
  round: {
    width: theme.touch.minTarget,
    height: theme.touch.minTarget,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
});
