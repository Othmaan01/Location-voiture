import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import {
  Bell,
  Building2,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react-native";

import { Avatar, Button, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useAppLockSetting } from "@/lib/app-lock";
import { MODE_HOME, MODE_LABEL, useMode, type AppMode } from "@/lib/mode";
import { useMe, useUpdateProfile } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

export default function ProfileScreen() {
  const { session, loading } = useSession();
  const router = useRouter();
  const me = useMe();
  const appLock = useAppLockSetting();
  const { mode, setMode } = useMode();
  const updateProfile = useUpdateProfile();

  /** Bascule d'espace (D9) : immediate, memorisee sur le compte pour les prochaines connexions. */
  const switchMode = (next: AppMode) => {
    if (next === mode) return;
    setMode(next);
    if (next !== "admin") updateProfile.mutate({ preferredMode: next });
    router.replace(MODE_HOME[next]);
  };
  const modes: AppMode[] = me.data?.platformRole ? ["client", "pro", "admin"] : ["client", "pro"];

  const toggleLock = async (next: boolean) => {
    if (next && !appLock.biometrics.available) {
      Alert.alert(
        "Aucun verrou configuré",
        "Activez Face ID, Touch ID ou un code sur votre appareil, puis réessayez.",
      );
      return;
    }
    await appLock.toggle(next);
  };

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

      <Card style={styles.modeCard}>
        <Text variant="bodyStrong">Mon espace</Text>
        <View style={styles.modes}>
          {modes.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => switchMode(m)}
              style={[styles.modeChip, mode === m ? styles.modeChipOn : null]}
            >
              <Text variant="smStrong" tone={mode === m ? "inverse" : "default"}>
                {MODE_LABEL[m]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="small" tone="dim">
          {mode === "client"
            ? "Chercher et réserver des véhicules."
            : mode === "pro"
              ? "Gérer votre flotte, vos agences et vos demandes."
              : "Vérifier et administrer les loueurs."}
        </Text>
      </Card>

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
        />
        <ListItem
          icon={<KeyRound size={22} color={theme.colors.text} />}
          title="Double authentification"
          subtitle={
            me.data?.platformRole
              ? "Obligatoire pour l'administration"
              : "Code en plus du mot de passe"
          }
          onPress={() => router.push("/profil/mfa")}
        />
        <ListItem
          icon={<LockKeyhole size={22} color={theme.colors.text} />}
          title={`Verrouillage ${appLock.biometrics.label}`}
          subtitle="Demandé à l'ouverture et après 30 s en arrière-plan"
          right={
            <Switch
              value={appLock.enabled}
              onValueChange={(v) => void toggleLock(v)}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor="#ffffff"
            />
          }
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
  modeCard: { gap: theme.space["3"] },
  modes: { flexDirection: "row", gap: theme.space["2"] },
  modeChip: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeChipOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
});
