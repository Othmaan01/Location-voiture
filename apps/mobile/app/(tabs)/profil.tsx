import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Bell,
  Building2,
  Info,
  LogOut,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react-native";

import { Avatar, Button, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

export default function ProfileScreen() {
  const { session, loading } = useSession();
  const router = useRouter();
  const me = useMe();

  if (loading) {
    return (
      <Screen title="Profil" dock scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen title="Profil" dock scroll={false}>
        <EmptyState
          title="Bienvenue"
          description="Créez un compte pour demander une réservation et suivre vos locations."
          action={
            <View style={styles.stack}>
              <Button label="Créer un compte" onPress={() => router.push("/(auth)/sign-up")} />
              <Button
                label="Se connecter"
                variant="ghost"
                onPress={() => router.push("/(auth)/sign-in")}
              />
            </View>
          }
        />
      </Screen>
    );
  }

  const fullName =
    [me.data?.firstName, me.data?.lastName].filter(Boolean).join(" ") ||
    (session.user.email ?? "Mon compte");
  const isUnreachable =
    me.isError && !(me.error instanceof ApiRequestError && me.error.status < 500);

  return (
    <Screen title="Profil" dock>
      <View style={styles.identity}>
        <Avatar name={fullName} size={56} round />
        <View style={styles.identityTexts}>
          <Text variant="h2">{fullName}</Text>
          <Text variant="sm" tone="muted">
            {session.user.email}
          </Text>
        </View>
      </View>
      {isUnreachable ? (
        <Card raised>
          <Text variant="sm" tone="muted">
            Impossible de joindre le serveur. Vérifiez votre connexion.
          </Text>
        </Card>
      ) : null}

      <Card padded={false}>
        <ListItem
          icon={<UserRound size={22} color={theme.colors.text} />}
          title="Informations personnelles"
          subtitle="Nom, téléphone"
          onPress={() => router.push("/profil/edit")}
        />
        <ListItem
          icon={<Bell size={22} color={theme.colors.text} />}
          title="Notifications"
          subtitle="Réponses des loueurs, rappels"
          last
        />
      </Card>

      <Card style={styles.proCard}>
        <View style={styles.proHeader}>
          <Building2 size={22} color={theme.colors.accentTint} />
          <Text variant="bodyStrong">Espace professionnel</Text>
        </View>
        {me.data && me.data.memberships.length > 0 ? (
          <View style={styles.stack}>
            {me.data.memberships.map((m) => (
              <ListItem
                key={m.organizationId}
                title={m.organizationName}
                subtitle={ROLE_LABEL[m.role]}
                onPress={() => router.push(`/(pro)/organizations/${m.organizationId}`)}
                last
              />
            ))}
            <Button
              label="Créer une autre organisation"
              variant="ghost"
              size="sm"
              onPress={() => router.push("/(pro)/onboarding")}
            />
          </View>
        ) : (
          <View style={styles.stack}>
            <Text variant="sm" tone="muted">
              Vous êtes loueur ? Publiez votre flotte, recevez des demandes, gérez votre planning.
            </Text>
            <Button
              label="Ouvrir l'espace pro"
              size="sm"
              onPress={() => router.push("/(pro)/onboarding")}
              style={styles.proButton}
            />
          </View>
        )}
      </Card>

      {me.data?.platformRole ? (
        <Card padded={false}>
          <ListItem
            icon={<ShieldAlert size={22} color={theme.colors.accentTint} />}
            title="Administration"
            subtitle="Vérification des loueurs"
            onPress={() => router.push("/(admin)/verifications")}
            last
          />
        </Card>
      ) : null}

      <Card padded={false}>
        <ListItem icon={<Info size={22} color={theme.colors.text} />} title="Aide et contact" />
        <ListItem
          icon={<ScrollText size={22} color={theme.colors.text} />}
          title="Mentions légales et CGU"
        />
        <ListItem
          icon={<ShieldCheck size={22} color={theme.colors.text} />}
          title="Confidentialité et données"
          subtitle="Exporter, supprimer"
        />
        <ListItem
          icon={<LogOut size={22} color={theme.colors.text} />}
          title="Se déconnecter"
          onPress={() => void supabase.auth.signOut()}
        />
        <ListItem
          icon={<Trash2 size={22} color={theme.colors.danger} />}
          title="Supprimer mon compte"
          danger
          onPress={() => router.push("/profil/delete")}
          last
        />
      </Card>
    </Screen>
  );
}

const ROLE_LABEL = { owner: "Propriétaire", manager: "Manager", agent: "Agent" } as const;

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  identityTexts: { flex: 1, gap: 2 },
  stack: { gap: theme.space["2"], alignSelf: "stretch" },
  proCard: { borderColor: theme.colors.accentDark, gap: theme.space["3"] },
  proHeader: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  proButton: { alignSelf: "flex-start" },
});
