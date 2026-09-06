import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";
import type { Conversation } from "@lv/contracts";

import { Avatar, Badge, Card, EmptyState, ListItem } from "@/components/ui";
import { theme } from "@/theme";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Liste de fils, cote client (nom du loueur) ou cote loueur (prenom du client). */
export function ConversationList({
  conversations,
  side,
  pending,
  emptyDescription,
}: {
  conversations: Conversation[];
  side: "customer" | "organization";
  pending: boolean;
  emptyDescription: string;
}) {
  const router = useRouter();
  if (pending) return <ActivityIndicator color={theme.colors.accent} />;
  if (conversations.length === 0)
    return <EmptyState title="Aucun message" description={emptyDescription} />;
  return (
    <Card padded={false}>
      {conversations.map((c, i) => {
        const title = side === "customer" ? c.organizationName : c.customerName;
        const context = [c.vehicleLabel, c.bookingReference ? `Réf. ${c.bookingReference}` : null]
          .filter(Boolean)
          .join(" · ");
        return (
          <ListItem
            key={c.id}
            icon={
              <Avatar
                name={title}
                uri={side === "customer" ? c.organizationLogoUrl : null}
                size={40}
                round
              />
            }
            title={title}
            subtitle={[context, c.lastMessagePreview].filter(Boolean).join(" — ")}
            right={
              c.unreadCount > 0 ? (
                <Badge label={String(c.unreadCount)} tone="accent" />
              ) : (
                <Badge label={when(c.lastMessageAt)} tone="neutral" />
              )
            }
            onPress={() => router.push(`/conversations/${c.id}`)}
            last={i === conversations.length - 1}
          />
        );
      })}
    </Card>
  );
}
