import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { LockKeyhole } from "lucide-react-native";

import { Button, Text } from "@/components/ui";
import { authenticate, isAppLockEnabled, onAppLockChange } from "@/lib/app-lock";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

/** Au-dela de ce delai en arriere-plan, l'app se reverrouille. */
const RELOCK_AFTER_MS = 30_000;

/**
 * Voile de verrouillage : couvre toute l'app tant que l'utilisateur ne s'est pas
 * authentifie (Face ID / Touch ID / code). Actif seulement avec une session et le
 * reglage active. L'ecran reste opaque : rien de l'app n'est lisible en dessous.
 */
export function AppLockGate({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    void isAppLockEnabled().then((e) => {
      setEnabled(e);
      if (e) setLocked(true);
    });
    return onAppLockChange((e) => {
      setEnabled(e);
      if (!e) setLocked(false);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        backgroundedAt.current = backgroundedAt.current ?? Date.now();
        return;
      }
      const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
      backgroundedAt.current = null;
      if (enabled && away > RELOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const visible = locked && !!session && !loading && enabled === true;
  useEffect(() => {
    if (visible) void unlock();
    // Une seule tentative automatique a l'apparition du voile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
      {children}
      {visible ? (
        <View style={styles.overlay} accessibilityViewIsModal>
          <View style={styles.badge}>
            <LockKeyhole size={28} color={theme.colors.accentTint} />
          </View>
          <Text variant="h2">Application verrouillée</Text>
          <Text variant="sm" tone="muted" style={styles.hint}>
            Face ID, Touch ID ou le code de votre appareil.
          </Text>
          <Button label="Déverrouiller" loading={busy} onPress={() => void unlock()} />
          <Button
            label="Se déconnecter"
            variant="ghost"
            size="sm"
            onPress={() => {
              setLocked(false);
              void supabase.auth.signOut();
            }}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space["4"],
    paddingHorizontal: theme.space["6"],
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { textAlign: "center" },
});
