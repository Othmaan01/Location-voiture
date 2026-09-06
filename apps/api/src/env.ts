import { z } from "zod";

/**
 * Variables d'environnement validees au demarrage. Un secret manquant fait
 * echouer le boot : on ne demarre jamais dans un etat partiellement configure.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PUBLIC_URL: z.url().default("http://localhost:4000"),
  API_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  API_CORS_ORIGINS: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  API_VERSION: z.string().default("0.1.0"),
  /** Schema de lien profond de l'app mobile (invitations, retours OAuth). */
  APP_DEEP_LINK_SCHEME: z.string().default("lv"),
  /**
   * Exige une session MFA (aal2) sur les routes d'administration.
   * Defaut : vrai en production, faux ailleurs. Staging le desactive explicitement
   * tant que l'app mobile ne propose pas l'enrolement MFA (TECH DEBT, voir SECURITY.md).
   */
  API_ADMIN_REQUIRE_MFA: z.stringbool().optional(),

  DATABASE_URL: z.string().min(1),

  SUPABASE_URL: z.url(),
  /** Emetteur attendu des JWT, ex. https://<ref>.supabase.co/auth/v1 */
  API_JWT_ISSUER: z.string().min(1),
  /**
   * Local uniquement : secret HS256 du projet Supabase local.
   * En production, laisser vide : la verification passe par le JWKS (cles asymetriques).
   */
  SUPABASE_JWT_SECRET: z.string().min(16).optional(),
  /**
   * Cle service_role : utilisee UNIQUEMENT par le module identity pour supprimer
   * un compte Auth. Jamais exposee, jamais loggee.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(16).optional(),
  /** Stripe Billing (Phase 5). Absents : le paiement est "bientot disponible", rien n'est bloque. */
  STRIPE_SECRET_KEY: z.string().min(16).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Configuration invalide :\n  ${issues}`);
  }
  return parsed.data;
}
