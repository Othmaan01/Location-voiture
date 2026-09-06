import { DomainError } from "./errors.js";

/**
 * Acces minimal a Supabase Storage avec la cle service_role, sans SDK :
 * URL signees d'upload et de lecture, suppression. La cle ne quitte pas ce module.
 * Le bucket `documents` est prive : aucune URL publique n'existe jamais.
 */
export interface StorageClient {
  createSignedUploadUrl(
    bucket: string,
    path: string,
  ): Promise<{ uploadUrl: string; token: string }>;
  createSignedReadUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  publicUrl(bucket: string, path: string): string;
  remove(bucket: string, paths: string[]): Promise<void>;
  exists(bucket: string, path: string): Promise<boolean>;
}

export function createStorageClient(
  supabaseUrl: string,
  serviceRoleKey: string | undefined,
): StorageClient {
  const base = `${supabaseUrl}/storage/v1`;
  const headers = () => {
    if (!serviceRoleKey)
      throw new DomainError("internal", "Stockage indisponible : cle d'administration absente.");
    return {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };
  };
  const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

  return {
    async createSignedUploadUrl(bucket, path) {
      // Le service exige un corps JSON, meme vide.
      const response = await fetch(`${base}/object/upload/sign/${bucket}/${encodePath(path)}`, {
        method: "POST",
        headers: headers(),
        body: "{}",
      });
      if (!response.ok)
        throw new DomainError("internal", "Impossible de preparer le televersement.", {
          status: response.status,
        });
      const body = (await response.json()) as { url?: string; token?: string };
      if (!body.url || !body.token)
        throw new DomainError("internal", "Reponse de stockage invalide.");
      // `url` contient deja `?token=` : on renvoie l'URL nue, le client ajoute le jeton lui-meme.
      const bare = body.url.split("?")[0] ?? body.url;
      return { uploadUrl: `${base}${bare}`, token: body.token };
    },

    async createSignedReadUrl(bucket, path, expiresInSeconds) {
      const response = await fetch(`${base}/object/sign/${bucket}/${encodePath(path)}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      });
      if (!response.ok)
        throw new DomainError("internal", "Impossible de generer le lien de lecture.", {
          status: response.status,
        });
      const body = (await response.json()) as { signedURL?: string };
      if (!body.signedURL) throw new DomainError("internal", "Reponse de stockage invalide.");
      return `${base}${body.signedURL}`;
    },

    publicUrl(bucket, path) {
      return `${base}/object/public/${bucket}/${encodePath(path)}`;
    },

    async remove(bucket, paths) {
      if (paths.length === 0) return;
      const response = await fetch(`${base}/object/${bucket}`, {
        method: "DELETE",
        headers: headers(),
        body: JSON.stringify({ prefixes: paths }),
      });
      if (!response.ok && response.status !== 404)
        throw new DomainError("internal", "Suppression du fichier impossible.", {
          status: response.status,
        });
    },

    async exists(bucket, path) {
      const response = await fetch(`${base}/object/info/${bucket}/${encodePath(path)}`, {
        headers: headers(),
      });
      return response.ok;
    },
  };
}
