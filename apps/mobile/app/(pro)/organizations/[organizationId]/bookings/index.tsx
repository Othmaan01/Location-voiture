import { useLocalSearchParams } from "expo-router";

import { OrgBookingsView } from "@/features/pro/views/OrgBookingsView";

export default function OrgBookingsScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  return <OrgBookingsView organizationId={organizationId} />;
}
