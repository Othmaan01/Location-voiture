import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

/**
 * Verrouillage de l'app par Face ID / Touch ID, avec le code de l'appareil en secours.
 * On s'appuie sur ce que le telephone sait deja faire : aucun code maison a stocker.
 * Le reglage vit dans le stockage securise ; la session Supabase n'est jamais touchee.
 */
const KEY = "lv.app_lock";
const listeners = new Set<(enabled: boolean) => void>();

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(KEY, "1");
  else await SecureStore.deleteItemAsync(KEY);
  for (const l of listeners) l(enabled);
}

export function onAppLockChange(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Face ID, Touch ID ou code de l'appareil disponible ? */
export async function describeBiometrics(): Promise<{ available: boolean; label: string }> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? "Face ID"
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? "Touch ID"
        : "Code de l'appareil";
    // Un code d'appareil suffit : la biometrie est un plus, pas une condition.
    return {
      available: (hardware && enrolled) || level !== LocalAuthentication.SecurityLevel.NONE,
      label,
    };
  } catch {
    return { available: false, label: "Face ID" };
  }
}

export async function authenticate(reason = "Déverrouiller l'application"): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Annuler",
      fallbackLabel: "Utiliser le code",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Reglage du verrouillage, pour l'ecran Profil. */
export function useAppLockSetting() {
  const [enabled, setEnabled] = useState(false);
  const [biometrics, setBiometrics] = useState<{ available: boolean; label: string }>({
    available: false,
    label: "Face ID",
  });
  useEffect(() => {
    void isAppLockEnabled().then(setEnabled);
    void describeBiometrics().then(setBiometrics);
    return onAppLockChange(setEnabled);
  }, []);
  const toggle = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (next && !biometrics.available) return false;
      const ok = await authenticate(
        next ? "Activer le verrouillage" : "Désactiver le verrouillage",
      );
      if (!ok) return false;
      await setAppLockEnabled(next);
      return true;
    },
    [biometrics.available],
  );
  return { enabled, biometrics, toggle };
}
