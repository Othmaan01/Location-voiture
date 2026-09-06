import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";

import { Button, Input, Sheet, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useStartConversation } from "@/lib/queries-messaging";
import { useSession } from "@/lib/session";

interface Props {
  visible: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  vehicleId?: string;
  bookingId?: string;
  /** Titre et amorce differents cote loueur (ecrit a un client). */
  toCustomerName?: string;
}

/**
 * Premier message vers un loueur (ou vers un client, depuis une reservation).
 * Ouvre le fil existant s'il y en a deja un.
 */
export function ContactSheet({
  visible,
  onClose,
  organizationId,
  organizationName,
  vehicleId,
  bookingId,
  toCustomerName,
}: Props) {
  const router = useRouter();
  const { session } = useSession();
  const start = useStartConversation();
  const [body, setBody] = useState("");
  const recipient = toCustomerName ?? organizationName;

  const send = () => {
    if (!session) {
      onClose();
      router.push("/(auth)/sign-in");
      return;
    }
    start.mutate(
      {
        organizationId,
        ...(vehicleId ? { vehicleId } : {}),
        ...(bookingId ? { bookingId } : {}),
        body: body.trim(),
      },
      {
        onSuccess: (d) => {
          setBody("");
          onClose();
          router.push(`/conversations/${d.conversation.id}`);
        },
        onError: (e) =>
          Alert.alert(
            "Message non envoyé",
            e instanceof ApiRequestError ? e.message : "Réessayez.",
          ),
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Écrire à ${recipient}`}>
      <Text variant="sm" tone="muted">
        {toCustomerName
          ? "Le client reçoit une notification et vous répond dans l'application."
          : `${organizationName} vous répond dans l'application. Le règlement se fait toujours auprès du loueur.`}
      </Text>
      <Input
        label="Votre message"
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={4}
        maxLength={2000}
        placeholder={
          toCustomerName
            ? "Ex. : Pensez à votre permis et à une carte bancaire pour la caution."
            : "Ex. : Bonjour, le véhicule est-il disponible ce week-end ?"
        }
      />
      <Button
        label="Envoyer"
        disabled={body.trim().length === 0}
        loading={start.isPending}
        onPress={send}
        style={styles.button}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({ button: { marginTop: 4 } });
