import { ActivityIndicator } from "react-native";

import { EmptyState, Screen } from "@/components/ui";
import { LoueurProfile } from "@/features/client/LoueurProfile";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";
import { useOrganization } from "@/lib/queries";
import { theme } from "@/theme";

/** Vitrine (retour fondateur) : le loueur voit sa page exactement comme un client, depuis la capsule. */
export default function ProShowcaseTab() {
  const organizationId = useCurrentOrganization();
  if (!organizationId) return <NoOrganization title="Vitrine" />;
  return <Showcase organizationId={organizationId} />;
}

function Showcase({ organizationId }: { organizationId: string }) {
  const org = useOrganization(organizationId);
  if (org.isPending) {
    return (
      <Screen eyebrow="Vue client" title="Vitrine" dock scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (org.data && org.data.status !== "verified") {
    return (
      <Screen eyebrow="Vue client" title="Vitrine" dock scroll={false}>
        <EmptyState
          title="Pas encore visible"
          description="Votre vitrine apparaît aux clients dès que votre organisation est vérifiée. En attendant, complétez vos agences et vos véhicules."
        />
      </Screen>
    );
  }
  return <LoueurProfile loueurId={organizationId} embedded />;
}
