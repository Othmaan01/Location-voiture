import { DomainError } from "./errors.js";

/**
 * Acces minimal a l'API d'administration Supabase Auth (GoTrue), sans SDK :
 * une seule operation, la suppression d'un utilisateur. La cle service_role
 * ne quitte jamais ce module.
 */
export interface SupabaseAdmin {
  deleteUser(userId: string): Promise<void>;
}

export function createSupabaseAdmin(
  supabaseUrl: string,
  serviceRoleKey: string | undefined,
): SupabaseAdmin {
  return {
    async deleteUser(userId) {
      if (!serviceRoleKey) {
        throw new DomainError(
          "internal",
          "Suppression de compte indisponible : cle d'administration absente.",
        );
      }
      const response = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        },
      );
      if (response.status === 404) return; // deja supprime : idempotent
      if (!response.ok) {
        throw new DomainError("internal", "La suppression du compte a echoue.", {
          status: response.status,
        });
      }
    },
  };
}
