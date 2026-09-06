import { useState } from "react";
import { Alert } from "react-native";
import type { ReportReason, ReportTarget } from "@lv/contracts";

import { Button, Input, Select, Sheet, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useCreateReport } from "@/lib/queries-reports";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "fraud", label: "Arnaque ou annonce trompeuse" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "spam", label: "Spam ou démarchage" },
  { value: "safety", label: "Sécurité (véhicule, comportement)" },
  { value: "other", label: "Autre" },
];

/** Signalement (ADR-0013) : motif + details, traite par l'administration. */
export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
  label,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: string;
  label: string;
}) {
  const create = useCreateReport();
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  return (
    <Sheet visible={visible} onClose={onClose} title={`Signaler ${label}`}>
      <Text variant="sm" tone="muted">
        Votre signalement est lu par notre équipe. Il n'est pas transmis au loueur.
      </Text>
      <Select label="Motif" value={reason} options={REASONS} onChange={setReason} />
      <Input
        label="Précisions (optionnel)"
        value={details}
        onChangeText={setDetails}
        multiline
        numberOfLines={3}
        maxLength={1000}
      />
      <Button
        label="Envoyer le signalement"
        variant="danger"
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            {
              targetType,
              targetId,
              reason,
              ...(details.trim() ? { details: details.trim() } : {}),
            },
            {
              onSuccess: () => {
                setDetails("");
                onClose();
                Alert.alert("Merci", "Signalement transmis à notre équipe.");
              },
              onError: (e) =>
                Alert.alert(
                  "Signalement impossible",
                  e instanceof ApiRequestError ? e.message : "Réessayez.",
                ),
            },
          )
        }
      />
    </Sheet>
  );
}
