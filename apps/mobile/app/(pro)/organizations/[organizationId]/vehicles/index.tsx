import { useLocalSearchParams } from "expo-router";

import { OrgVehiclesView } from "@/features/pro/views/OrgVehiclesView";

export default function VehiclesScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  return <OrgVehiclesView organizationId={organizationId} />;
}
