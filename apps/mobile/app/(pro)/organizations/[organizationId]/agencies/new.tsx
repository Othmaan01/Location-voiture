import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { useOrganization } from "@/lib/queries";
import { useCreateAgency } from "@/lib/queries-catalog";

export default function NewAgencyScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const create = useCreateAgency(organizationId);
  const org = useOrganization(organizationId);
  return (
    <Screen title="Nouvelle agence" back>
      <AgencyForm
        siren={org.data?.siren ?? null}
        submitting={create.isPending}
        onSubmit={async (input) => {
          await create.mutateAsync(input);
          router.back();
        }}
      />
    </Screen>
  );
}
