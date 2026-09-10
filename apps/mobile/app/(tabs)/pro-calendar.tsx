import { useLocalSearchParams } from "expo-router";
import { OrgCalendarView } from "@/features/pro/views/OrgCalendarView";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";

export default function ProCalendarTab() {
  const organizationId = useCurrentOrganization();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  if (!organizationId) return <NoOrganization title="Calendrier" />;
  return (
    <OrgCalendarView
      organizationId={organizationId}
      embedded
      {...(vehicleId ? { initialVehicleId: vehicleId } : {})}
    />
  );
}
