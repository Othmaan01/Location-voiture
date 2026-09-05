import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from "react-native";
import { z } from "zod";
import { UserPlus } from "lucide-react-native";
import type { Invitation, OrganizationMember, OrganizationRole } from "@lv/contracts";

import { Avatar, Badge, Button, Card, Input, ListItem, Screen, Sheet, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import {
  useCreateInvitation,
  useInvitations,
  useMe,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "@/lib/queries";
import { EmailField } from "@/lib/validation";
import { theme } from "@/theme";

const ROLE_LABEL: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  agent: "Agent",
};
const ROLE_HELP: Record<"manager" | "agent", string> = {
  manager: "Gère les véhicules, les tarifs et les documents",
  agent: "Traite les demandes et les disponibilités",
};

const InviteSchema = z.object({ email: EmailField, role: z.enum(["manager", "agent"]) });
type InviteForm = z.infer<typeof InviteSchema>;

export default function MembersScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const me = useMe();
  const myRole = me.data?.memberships.find((m) => m.organizationId === organizationId)?.role;
  const isOwner = myRole === "owner";
  const members = useMembers(organizationId);
  const invitations = useInvitations(organizationId, isOwner);
  const invite = useCreateInvitation(organizationId);
  const revoke = useRevokeInvitation(organizationId);
  const updateRole = useUpdateMemberRole(organizationId);
  const removeMember = useRemoveMember(organizationId);
  const [sheet, setSheet] = useState<"invite" | { member: OrganizationMember } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<InviteForm>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { email: "", role: "agent" },
  });

  const submitInvite = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const created = await invite.mutateAsync(values);
      setSheet(null);
      form.reset();
      await Share.share({
        message: `Rejoignez notre organisation sur l'application : ${created.link}`,
      });
    } catch (error) {
      setServerError(
        error instanceof ApiRequestError && error.status < 500
          ? error.message
          : "Invitation impossible. Réessayez.",
      );
    }
  });

  const confirm = (title: string, message: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", style: "destructive", onPress: onConfirm },
    ]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setSheet(null);
    } catch (error) {
      Alert.alert(
        "Action impossible",
        error instanceof ApiRequestError ? error.message : "Réessayez plus tard.",
      );
    }
  };

  return (
    <Screen
      title="Membres"
      back
      headerRight={
        isOwner ? (
          <Button
            label="Inviter"
            size="sm"
            icon={<UserPlus size={18} color="#ffffff" />}
            onPress={() => setSheet("invite")}
          />
        ) : undefined
      }
    >
      {members.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {members.data ? (
        <Card padded={false}>
          {members.data.members.map((m, i) => {
            const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || "Membre";
            const canEdit = isOwner && m.userId !== me.data?.userId;
            return (
              <ListItem
                key={m.userId}
                icon={<Avatar name={name} size={32} round />}
                title={m.userId === me.data?.userId ? `${name} (vous)` : name}
                subtitle={ROLE_LABEL[m.role]}
                onPress={canEdit ? () => setSheet({ member: m }) : undefined}
                last={i === members.data.members.length - 1}
              />
            );
          })}
        </Card>
      ) : null}

      {isOwner && invitations.data && invitations.data.invitations.length > 0 ? (
        <View style={styles.section}>
          <Text variant="caps" tone="muted">
            Invitations en attente
          </Text>
          <Card padded={false}>
            {invitations.data.invitations.map((inv: Invitation, i: number) => (
              <ListItem
                key={inv.id}
                title={inv.email}
                subtitle={`${ROLE_LABEL[inv.role]} · expire le ${new Date(inv.expiresAt).toLocaleDateString("fr-FR")}`}
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Révoquer l'invitation"
                    hitSlop={8}
                    onPress={() =>
                      confirm(
                        "Révoquer l'invitation ?",
                        inv.email,
                        () => void act(() => revoke.mutateAsync(inv.id)),
                      )
                    }
                  >
                    <Badge label="Révoquer" tone="accent" />
                  </Pressable>
                }
                last={i === invitations.data.invitations.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}

      <Sheet
        visible={sheet === "invite"}
        onClose={() => setSheet(null)}
        title="Inviter un collaborateur"
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          )}
        />
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <View style={styles.roles}>
              {(["agent", "manager"] as const).map((role) => (
                <Pressable
                  key={role}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: field.value === role }}
                  onPress={() => field.onChange(role)}
                  style={[styles.role, field.value === role ? styles.roleOn : null]}
                >
                  <Text variant="smStrong">{ROLE_LABEL[role]}</Text>
                  <Text variant="small" tone="muted">
                    {ROLE_HELP[role]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
        {serverError ? (
          <Text variant="sm" tone="danger">
            {serverError}
          </Text>
        ) : null}
        <Text variant="small" tone="dim">
          Un lien d'invitation valable 7 jours sera généré : partagez-le à cette personne. Elle
          devra se connecter avec cette adresse.
        </Text>
        <Button
          label="Créer l'invitation"
          loading={invite.isPending}
          onPress={() => void submitInvite()}
        />
      </Sheet>

      <Sheet
        visible={sheet !== null && sheet !== "invite"}
        onClose={() => setSheet(null)}
        title={
          sheet && sheet !== "invite"
            ? [sheet.member.firstName, sheet.member.lastName].filter(Boolean).join(" ") || "Membre"
            : ""
        }
      >
        {sheet && sheet !== "invite" ? (
          <View style={styles.stack}>
            {(["agent", "manager", "owner"] as const)
              .filter((r) => r !== sheet.member.role)
              .map((role) => (
                <Button
                  key={role}
                  label={
                    role === "owner"
                      ? "Nommer propriétaire"
                      : `Passer ${ROLE_LABEL[role].toLowerCase()}`
                  }
                  variant="ghost"
                  onPress={() =>
                    void act(() => updateRole.mutateAsync({ userId: sheet.member.userId, role }))
                  }
                />
              ))}
            <Button
              label="Retirer de l'organisation"
              variant="danger"
              onPress={() =>
                confirm(
                  "Retirer ce membre ?",
                  "Il perdra immédiatement l'accès.",
                  () => void act(() => removeMember.mutateAsync(sheet.member.userId)),
                )
              }
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.space["2"] },
  roles: { gap: theme.space["2"] },
  role: {
    padding: theme.space["3"],
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    gap: 2,
  },
  roleOn: { borderColor: theme.colors.accent },
  stack: { gap: theme.space["2"] },
});
