import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";
import { Calendar, Info } from "lucide-react-native";
import type { Quote } from "@lv/contracts";

import { Button, Card, EmptyState, Input, Screen, Text } from "@/components/ui";
import { PeriodSheet } from "@/features/client/PeriodSheet";
import { defaultPeriod, formatPeriod, useSearchState } from "@/features/client/search-state";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useCreateBooking, useCreateQuote } from "@/lib/queries-bookings";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/**
 * Demande de reservation (ADR-0005 cote client) : dates -> devis fige par le serveur -> recapitulatif -> envoi.
 * Le client ne transmet jamais un montant : seulement l'identifiant du devis.
 */
export default function BookingRequestScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const search = useSearchState();
  const [period, setPeriod] = useState(() =>
    search.from && search.to ? { from: search.from, to: search.to } : defaultPeriod(),
  );
  const [datesOpen, setDatesOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createQuote = useCreateQuote();
  const createBooking = useCreateBooking();
  // Une cle d'idempotence par tentative d'envoi : un retry reseau ne cree jamais deux demandes.
  const idempotencyKey = useMemo(() => Crypto.randomUUID(), []);

  useEffect(() => {
    setError(null);
    setQuote(null);
    createQuote.mutate(
      { vehicleId, from: period.from, to: period.to },
      {
        onSuccess: setQuote,
        onError: (e) =>
          setError(e instanceof ApiRequestError ? e.message : "Impossible de calculer le prix."),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, period.from, period.to]);

  const send = () => {
    if (!quote) return;
    if (!session) {
      router.push("/(auth)/sign-in");
      return;
    }
    createBooking.mutate(
      { quoteId: quote.id, message: message.trim() || undefined, idempotencyKey },
      {
        onSuccess: (b) => router.replace(`/reservations/${b.id}`),
        onError: (e) =>
          setError(e instanceof ApiRequestError ? e.message : "Envoi impossible. Réessayez."),
      },
    );
  };
  const expired = quote ? new Date(quote.expiresAt).getTime() < Date.now() : false;

  return (
    <Screen title="Votre demande" back>
      <Card padded={false}>
        <View style={styles.row}>
          <Calendar size={22} color={theme.colors.textMuted} />
          <View style={styles.rowTexts}>
            <Text variant="small" tone="muted">
              Retrait → retour
            </Text>
            <Text variant="bodyStrong">{formatPeriod(period.from, period.to)}</Text>
          </View>
          <Button label="Modifier" variant="ghost" size="sm" onPress={() => setDatesOpen(true)} />
        </View>
      </Card>

      {createQuote.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error && !quote ? (
        <EmptyState
          title="Pas de prix pour ces dates"
          description={error}
          action={
            <Button label="Changer les dates" variant="ghost" onPress={() => setDatesOpen(true)} />
          }
        />
      ) : null}
      {quote ? (
        <Card style={styles.quote}>
          {quote.lines.map((l, i) => (
            <View key={i} style={styles.line}>
              <Text variant="sm" tone="muted">
                {l.quantity} × {l.label.toLowerCase()} à {formatEuros(l.unit.cents)}
              </Text>
              <Text variant="smStrong">{formatEuros(l.amount.cents)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text variant="bodyStrong">Total à régler à l'agence</Text>
            <Text variant="bodyStrong">{formatEuros(quote.total.cents)}</Text>
          </View>
          <View style={styles.line}>
            <Text variant="sm" tone="muted">
              Caution (empreinte sur place)
            </Text>
            <Text variant="sm">{formatEuros(quote.deposit.cents)}</Text>
          </View>
          {quote.kmIncludedPerDay != null ? (
            <Text variant="small" tone="dim">
              {quote.kmIncludedPerDay} km/jour inclus
              {quote.extraKmCents != null ? `, puis ${formatEuros(quote.extraKmCents)}/km` : ""}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Input
        label="Message au loueur (optionnel)"
        value={message}
        onChangeText={setMessage}
        placeholder="Heure d'arrivée, siège bébé, question…"
        multiline
        numberOfLines={3}
        maxLength={1000}
        style={styles.multiline}
      />
      <View style={styles.note}>
        <Info size={16} color={theme.colors.textDim} strokeWidth={2} />
        <Text variant="small" tone="muted" style={styles.noteText}>
          Aucun paiement en ligne. Le loueur confirme sous 24 h, puis vous réglez sur place.
          Annulation gratuite avant le retrait.
        </Text>
      </View>
      {error && quote ? (
        <Text variant="sm" tone="danger">
          {error}
        </Text>
      ) : null}
      <Button
        label={session ? "Envoyer la demande" : "Se connecter pour envoyer"}
        disabled={!quote || expired}
        loading={createBooking.isPending}
        onPress={send}
      />
      <PeriodSheet
        visible={datesOpen}
        from={period.from}
        to={period.to}
        onClose={() => setDatesOpen(false)}
        onApply={(f, t) => {
          setPeriod({ from: f, to: t });
          search.setPeriod(f, t);
          setDatesOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["3"],
  },
  rowTexts: { flex: 1, gap: 2 },
  quote: { gap: theme.space["2"] },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.space["2"],
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  note: { flexDirection: "row", gap: theme.space["2"], alignItems: "flex-start" },
  noteText: { flex: 1 },
});
