import * as SecureStore from "expo-secure-store";

/**
 * Adaptateur de stockage pour la session Supabase, adosse au Keychain (iOS)
 * et au Keystore (Android). Jamais AsyncStorage pour un token.
 *
 * Le Keychain iOS limite chaque entree a ~2 Ko ; une session Supabase peut
 * depasser cette taille. On decoupe donc la valeur en fragments.
 */
const CHUNK_SIZE = 1800;
const COUNT_SUFFIX = "__count";

const chunkKey = (key: string, index: number) => `${key}__${index}`;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const countRaw = await SecureStore.getItemAsync(key + COUNT_SUFFIX);
    if (!countRaw) return null;
    const count = Number(countRaw);
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    await this.removeItem(key);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        },
      );
    }
    await SecureStore.setItemAsync(key + COUNT_SUFFIX, String(count));
  },
  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(key + COUNT_SUFFIX);
    const count = countRaw ? Number(countRaw) : 0;
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
    await SecureStore.deleteItemAsync(key + COUNT_SUFFIX);
  },
};
