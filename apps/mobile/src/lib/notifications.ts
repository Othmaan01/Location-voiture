import { z } from "zod";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { apiRequest } from "./api";

const DeviceResponse = z.object({ id: z.string(), platform: z.string(), lastSeenAt: z.string() });
const OPT_OUT_KEY = "push-opt-out";

export type PushState = "on" | "off" | "denied";

/** L'utilisateur a coupe les notifications depuis l'application (independant du reglage iOS). */
export async function isPushOptedOut(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(OPT_OUT_KEY)) === "1";
  } catch {
    return false;
  }
}

/** Etat affiche dans le reglage « Sur ce telephone ». */
export async function readPushState(): Promise<PushState> {
  if (await isPushOptedOut()) return "off";
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return "on";
    if (p.status === "denied" && !p.canAskAgain) return "denied";
  } catch {
    // simulateur ou module absent
  }
  return "off";
}

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId;
}

/** Coupe les notifications pour ce telephone : le jeton est retire cote serveur. */
export async function unregisterDeviceForPush(): Promise<void> {
  await SecureStore.setItemAsync(OPT_OUT_KEY, "1");
  try {
    const id = projectId();
    if (!Device.isDevice || !id) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await apiRequest(`/v1/devices/${encodeURIComponent(token)}`, z.null(), { method: "DELETE" });
  } catch {
    // le jeton disparaitra de lui-meme (appareil inconnu d'Expo)
  }
}

/**
 * Enregistre l'appareil pour les notifications push, si l'utilisateur l'autorise.
 * Silencieux en cas d'echec : un refus de permission ou un simulateur ne doit
 * jamais casser un parcours. Ne s'execute que sur un appareil physique.
 */
export async function registerDeviceForPush(force = false): Promise<boolean> {
  try {
    if (!force && (await isPushOptedOut())) return false;
    if (force) await SecureStore.deleteItemAsync(OPT_OUT_KEY);
    if (!Device.isDevice) return false;
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return false;

    const id = projectId();
    if (!id) return false; // pas encore de projet EAS : rien a enregistrer
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await apiRequest("/v1/devices", DeviceResponse, {
      method: "PUT",
      body: { platform: Platform.OS === "ios" ? "ios" : "android", token },
    });
    return true;
  } catch {
    return false;
  }
}
