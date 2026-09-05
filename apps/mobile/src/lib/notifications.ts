import { z } from "zod";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { apiRequest } from "./api";

const DeviceResponse = z.object({ id: z.string(), platform: z.string(), lastSeenAt: z.string() });

/**
 * Enregistre l'appareil pour les notifications push, si l'utilisateur l'autorise.
 * Silencieux en cas d'echec : un refus de permission ou un simulateur ne doit
 * jamais casser un parcours. Ne s'execute que sur un appareil physique.
 */
export async function registerDeviceForPush(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false;
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return false;

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;
    if (!projectId) return false; // pas encore de projet EAS : rien a enregistrer
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiRequest("/v1/devices", DeviceResponse, {
      method: "PUT",
      body: { platform: Platform.OS === "ios" ? "ios" : "android", token },
    });
    return true;
  } catch {
    return false;
  }
}
