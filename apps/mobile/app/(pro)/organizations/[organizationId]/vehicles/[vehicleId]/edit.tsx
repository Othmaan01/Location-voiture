import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { Screen } from "@/components/ui";
import { VehicleForm } from "@/features/pro/VehicleForm";
import { useAgencies, useUpdateVehicle, useVehicle } from "@/lib/queries-catalog";
import { theme } from "@/theme";

export default function EditVehicleScreen() {
  const { organizationId, vehicleId } = useLocalSearchParams<{
    organizationId: string;
    vehicleId: string;
  }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  const vehicle = useVehicle(vehicleId);
  const update = useUpdateVehicle(organizationId, vehicleId);
  return (
    <Screen title="Caractéristiques" back>
      {agencies.data && vehicle.data ? (
        <VehicleForm
          agencies={agencies.data.agencies}
          initial={vehicle.data}
          submitting={update.isPending}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            router.back();
          }}
        />
      ) : (
        <ActivityIndicator color={theme.colors.accent} />
      )}
    </Screen>
  );
}
