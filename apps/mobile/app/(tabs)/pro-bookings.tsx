import { OrgBookingsView } from "@/features/pro/views/OrgBookingsView";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";

export default function ProBookingsTab() {
  const organizationId = useCurrentOrganization();
  if (!organizationId) return <NoOrganization title="Réservations" />;
  return <OrgBookingsView organizationId={organizationId} embedded />;
}
