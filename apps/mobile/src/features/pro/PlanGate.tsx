import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

import { useMode } from "@/lib/mode";
import { useOrganization } from "@/lib/queries";

/**
 * Etape obligatoire (ADR-0022) : un loueur dont l'organisation n'a pas encore de forfait choisi
 * est envoye sur l'ecran des forfaits, sauf s'il y est deja ou s'il cree son organisation.
 */
export function PlanGate() {
  const { mode, organizationId } = useMode();
  const org = useOrganization(mode === "pro" && organizationId ? organizationId : "");
  const segments = useSegments() as string[];
  const router = useRouter();
  const onPlans = segments.includes("plans") || segments.includes("onboarding");
  useEffect(() => {
    if (mode !== "pro" || !organizationId || !org.data || onPlans) return;
    if (org.data.planChosenAt === null)
      router.replace({
        pathname: "/(pro)/organizations/[organizationId]/plans",
        params: { organizationId, required: "1" },
      });
  }, [mode, organizationId, org.data, onPlans, router]);
  return null;
}
