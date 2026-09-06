import { Screen } from "@/components/ui";
import { ConversationList } from "@/features/messaging/ConversationList";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";
import { useOrgConversations } from "@/lib/queries-messaging";

export default function ProMessagesTab() {
  const organizationId = useCurrentOrganization();
  if (!organizationId) return <NoOrganization title="Messages" />;
  return <OrgMessages organizationId={organizationId} />;
}

function OrgMessages({ organizationId }: { organizationId: string }) {
  const conversations = useOrgConversations(organizationId);
  return (
    <Screen eyebrow="Espace loueur" title="Messages" dock>
      <ConversationList
        conversations={conversations.data?.conversations ?? []}
        side="organization"
        pending={conversations.isPending}
        emptyDescription="Les questions des clients et les échanges liés aux réservations apparaîtront ici."
      />
    </Screen>
  );
}
