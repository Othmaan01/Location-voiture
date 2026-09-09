import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui";
import { AgencyForm } from "@/features/pro/AgencyForm";
import { celebrate } from "@/lib/celebrate";
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
          const created = await create.mutateAsync(input);
          if (created.status === "published")
            celebrate("Agence en ligne", "Vous pouvez publier vos véhicules.");
          router.back();
        }}
      />
    </Screen>
  );
}
