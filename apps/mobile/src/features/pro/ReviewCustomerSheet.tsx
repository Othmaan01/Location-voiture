import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";

import { Button, Input, Sheet, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { useReviewCustomer } from "@/lib/queries-customer-reviews";
import { theme } from "@/theme";

/** Le loueur note le client apres une location terminee (ADR-0020) : cinq etoiles et un mot. */
export function ReviewCustomerSheet({
  bookingId,
  customerName,
  visible,
  onClose,
}: {
  bookingId: string;
  customerName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const review = useReviewCustomer(bookingId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = () => {
    if (rating === 0) {
      Alert.alert("Choisissez une note", "De une à cinq étoiles.");
      return;
    }
    review.mutate(
      { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      {
        onSuccess: () => {
          onClose();
          celebrate("Client noté", "Merci, ça aide les autres agences.");
        },
        onError: (e) =>
          Alert.alert("Impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={`Noter ${customerName}`}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`}
            onPress={() => setRating(n)}
            hitSlop={6}
          >
            <Star
              size={36}
              color={n <= rating ? theme.colors.warning : theme.colors.textDim}
              fill={n <= rating ? theme.colors.warning : "transparent"}
            />
          </Pressable>
        ))}
      </View>
      <Text variant="small" tone="muted" style={styles.hint}>
        {rating === 0
          ? "Ponctualité, état du véhicule au retour, communication."
          : ["", "À éviter", "Moyen", "Correct", "Très bien", "Client idéal"][rating]}
      </Text>
      <Input
        label="Un mot pour les autres agences (facultatif)"
        value={comment}
        onChangeText={setComment}
        placeholder="Ex. Véhicule rendu propre et à l'heure."
        multiline
        maxLength={600}
      />
      <Button label="Publier la note" loading={review.isPending} onPress={submit} />
      <Text variant="small" tone="dim">
        Visible par le client sur son profil et par les loueurs sur ses prochaines demandes.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.space["3"],
    paddingVertical: theme.space["2"],
  },
  hint: { textAlign: "center" },
});
