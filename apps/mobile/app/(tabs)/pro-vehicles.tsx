import { OrgVehiclesView } from "@/features/pro/views/OrgVehiclesView";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";

export default function ProVehiclesTab() {
  const organizationId = useCurrentOrganization();
  if (!organizationId) return <NoOrganization title="Véhicules" />;
  return <OrgVehiclesView organizationId={organizationId} embedded />;
}
