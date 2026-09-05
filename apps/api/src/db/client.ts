import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDatabase>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Connexion Postgres de l'API. Elle utilise un role qui contourne RLS
 * (l'API est l'autorite, ADR-0003) : l'autorisation est faite par shared/authz
 * AVANT toute requete. Ne jamais exposer ce client a du code non autorise.
 */
export function createDatabase(url: string) {
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false, // compatible pooler transactionnel (Supavisor)
  });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}
