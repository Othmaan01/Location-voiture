import { Alert, Linking, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Calendar, Car, Info, Phone } from "lucide-react-native";
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
}

/** Les deux seules actions sur un vehicule (ADR-0009) : demander une reservation, contacter le loueur. */
export function VehicleActionSheet({ vehicle, loueurName, phone, onClose, onRequest }: Props) {
  const contact = () => {
    if (!phone) {
      Alert.alert(
        "Contact",
        "Ce loueur n'a pas renseigné de téléphone. Faites une demande de réservation, il vous répondra directement.",
      );
      return;
    }
    void Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };
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
                  {formatEuros(vehicle.dailyCents)}{" "}
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
              icon={<Phone size={20} color={theme.colors.text} strokeWidth={2} />}
              onPress={contact}
            />
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
  actions: { gap: theme.space["2"] },
  note: { flexDirection: "row", gap: theme.space["2"], alignItems: "flex-start" },
  noteText: { flex: 1 },
});
