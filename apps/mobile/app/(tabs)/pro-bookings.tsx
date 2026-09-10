import { useLocalSearchParams } from "expo-router";
import { OrgBookingsView } from "@/features/pro/views/OrgBookingsView";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";

export default function ProBookingsTab() {
  const organizationId = useCurrentOrganization();
  const params = useLocalSearchParams<{ section?: string; tab?: string }>();
  if (!organizationId) return <NoOrganization title="Réservations" />;
  return (
    <OrgBookingsView
      organizationId={organizationId}
      embedded
      initialSection={params.section === "messages" ? "messages" : "bookings"}
      initialTab={
        params.tab === "upcoming" || params.tab === "past" || params.tab === "requested"
          ? params.tab
          : undefined
      }
    />
  );
}
