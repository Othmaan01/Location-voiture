import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { Screen } from "@/components/ui";
import { VehicleForm } from "@/features/pro/VehicleForm";
import { useAgencies, useCreateVehicle } from "@/lib/queries-catalog";
import { theme } from "@/theme";

export default function NewVehicleScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  const create = useCreateVehicle(organizationId);
  return (
    <Screen title="Nouveau véhicule" back>
      {agencies.data ? (
        <VehicleForm
          agencies={agencies.data.agencies}
          submitting={create.isPending}
          onSubmit={async (input) => {
            const v = await create.mutateAsync(input);
            router.replace(`/(pro)/organizations/${organizationId}/vehicles/${v.id}`);
          }}
        />
      ) : (
        <ActivityIndicator color={theme.colors.accent} />
      )}
    </Screen>
  );
}
