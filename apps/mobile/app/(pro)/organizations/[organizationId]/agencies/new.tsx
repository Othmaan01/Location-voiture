import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { useCreateAgency } from "@/lib/queries-catalog";

export default function NewAgencyScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const create = useCreateAgency(organizationId);
  return (
    <Screen title="Nouvelle agence" back>
      <AgencyForm
        submitting={create.isPending}
        onSubmit={async (input) => {
          await create.mutateAsync(input);
          router.back();
        }}
      />
    </Screen>
  );
}
