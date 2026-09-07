import { Linking, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Calendar, Car, Info, MessageCircle, Phone } from "lucide-react-native";
import type { PublicVehicleCard } from "@lv/contracts";

import { Button, Sheet, Text } from "@/components/ui";
import { CATEGORY_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatEuros } from "@/features/pro/labels";
import { theme } from "@/theme";

interface Props {
  vehicle: PublicVehicleCard | null;
  loueurName: string;
  phone: string | null;
  onClose: () => void;
  onRequest: () => void;
  /** Ouvre la redaction d'un message au loueur (ADR-0012). */
  onMessage: () => void;
}

/** Les deux seules actions sur un vehicule (ADR-0009) : demander une reservation, contacter le loueur. */
export function VehicleActionSheet({
  vehicle,
  loueurName,
  phone,
  onClose,
  onRequest,
  onMessage,
}: Props) {
  return (
    <Sheet visible={vehicle !== null} onClose={onClose}>
      {vehicle ? (
        <>
          <View style={styles.head}>
            {vehicle.photoUrl ? (
              <Image source={{ uri: vehicle.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Car size={26} color={theme.colors.textDim} />
              </View>
            )}
            <View style={styles.texts}>
              <Text variant="bodyStrong">
                {vehicle.brand} {vehicle.model}
                {vehicle.version ? ` · ${vehicle.version}` : ""}
              </Text>
              <Text variant="small" tone="muted">
                {[
                  TRANSMISSION_LABEL[vehicle.transmission],
                  FUEL_LABEL[vehicle.fuel],
                  `${vehicle.seats} places`,
                  CATEGORY_LABEL[vehicle.category],
                ].join(" · ")}
              </Text>
              {vehicle.dailyCents != null ? (
                <Text variant="bodyStrong">
                  {vehicle.discountedDailyCents != null ? (
                    <>
                      <Text variant="small" tone="dim" style={styles.struck}>
                        {formatEuros(vehicle.dailyCents)}
                      </Text>{" "}
                      {formatEuros(vehicle.discountedDailyCents)}
                    </>
                  ) : (
                    formatEuros(vehicle.dailyCents)
                  )}{" "}
                  <Text variant="small" tone="muted">
                    / jour
                    {vehicle.depositCents ? ` · caution ${formatEuros(vehicle.depositCents)}` : ""}
                  </Text>
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              label="Demander une réservation"
              icon={<Calendar size={20} color="#ffffff" strokeWidth={2} />}
              onPress={onRequest}
            />
            <Button
              label="Contacter le loueur"
              variant="ghost"
              icon={<MessageCircle size={20} color={theme.colors.text} strokeWidth={2} />}
              onPress={onMessage}
            />
            {phone ? (
              <Button
                label="Appeler"
                variant="ghost"
                size="sm"
                icon={<Phone size={16} color={theme.colors.text} strokeWidth={2} />}
                onPress={() => void Linking.openURL(`tel:${phone.replace(/\s/g, "")}`)}
              />
            ) : null}
          </View>
          <View style={styles.note}>
            <Info size={16} color={theme.colors.textDim} strokeWidth={2} />
            <Text variant="small" tone="muted" style={styles.noteText}>
              {loueurName} vous répond directement. Le règlement se fait auprès du loueur, jamais
              sur l'application.
            </Text>
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: theme.space["3"], alignItems: "center" },
  photo: { width: 84, height: 64, borderRadius: 12, backgroundColor: theme.colors.surfaceRaised },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  struck: { textDecorationLine: "line-through" },
  actions: { gap: theme.space["2"] },
  note: { flexDirection: "row", gap: theme.space["2"], alignItems: "flex-start" },
  noteText: { flex: 1 },
});
