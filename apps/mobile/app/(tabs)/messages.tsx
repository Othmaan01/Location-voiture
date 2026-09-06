import { useRouter } from "expo-router";

import { Button, EmptyState, Screen } from "@/components/ui";
import { ConversationList } from "@/features/messaging/ConversationList";
import { useConversations } from "@/lib/queries-messaging";
import { useSession } from "@/lib/session";

/** Messages du client : un fil par loueur ou par reservation. */
export default function MessagesTab() {
  const { session } = useSession();
  const router = useRouter();
  const conversations = useConversations();
  if (!session) {
    return (
      <Screen title="Messages" dock scroll={false}>
        <EmptyState
          title="Vos échanges avec les loueurs"
          description="Connectez-vous pour écrire à un loueur et suivre ses réponses."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      </Screen>
    );
  }
  return (
    <Screen title="Messages" dock>
      <ConversationList
        conversations={conversations.data?.conversations ?? []}
        side="customer"
        pending={conversations.isPending}
        emptyDescription="Depuis un véhicule, touchez « Contacter le loueur » : votre échange apparaîtra ici."
      />
    </Screen>
  );
}
