import { useMode } from "@/lib/mode";
import { useMe } from "@/lib/queries";

/** Organisation courante du mode loueur : celle choisie, sinon la premiere ; null sans organisation. */
export function useCurrentOrganization(): string | null {
  const me = useMe();
  const organizationId = useMode((s) => s.organizationId);
  const memberships = me.data?.memberships ?? [];
  if (organizationId && memberships.some((m) => m.organizationId === organizationId))
    return organizationId;
  return memberships[0]?.organizationId ?? null;
}
