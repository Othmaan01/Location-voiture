import { DomainError } from "./errors.js";

/**
 * Acces minimal a l'API d'administration Supabase Auth (GoTrue), sans SDK :
 * une seule operation, la suppression d'un utilisateur. La cle service_role
 * ne quitte jamais ce module.
 */
export interface SupabaseAdmin {
  deleteUser(userId: string): Promise<void>;
  /** Adresse du compte, pour l'envoi d'un document ; null si indisponible. */
  getUserEmail(userId: string): Promise<string | null>;
  /**
   * Cree un compte deja confirme (ADR-0019) : l'inscription passe par le moteur tant que
   * l'envoi d'e-mails de confirmation n'est pas en place. Renvoie « exists » si l'adresse est prise.
   */
  createUser(input: {
    email: string;
    password: string;
    metadata: Record<string, string>;
  }): Promise<
    { status: "created"; userId: string } | { status: "exists" } | { status: "weak_password" }
  >;
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
    async createUser(input) {
      if (!serviceRoleKey)
        throw new DomainError(
          "internal",
          "Inscription indisponible : cle d'administration absente.",
        );
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: input.metadata,
        }),
      });
      const body = (await response.json()) as {
        id?: string;
        error_code?: string;
        code?: string | number;
        msg?: string;
      };
      if (response.ok && body.id) return { status: "created", userId: body.id };
      const code = String(body.error_code ?? body.code ?? "");
      if (code === "email_exists" || /already|exists/i.test(body.msg ?? ""))
        return { status: "exists" };
      if (code === "weak_password" || /password/i.test(body.msg ?? ""))
        return { status: "weak_password" };
      throw new DomainError("internal", "La creation du compte a echoue.", {
        status: response.status,
      });
    },
    async getUserEmail(userId) {
      if (!serviceRoleKey) return null;
      const response = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as { email?: string | null };
      return body.email ?? null;
    },
  };
}
