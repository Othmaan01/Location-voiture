import { createDatabase } from "./db/client.js";
import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";
import { createTokenVerifier } from "./shared/auth.js";
import { createLogger } from "./shared/logger.js";
import { createStorageClient } from "./shared/storage.js";
import { createSupabaseAdmin } from "./shared/supabase-admin.js";

const env = loadEnv();
const logger = createLogger(env.API_LOG_LEVEL, env.NODE_ENV === "development");
const database = createDatabase(env.DATABASE_URL);

const app = await buildServer({
  env,
  db: database.db,
  verifyToken: createTokenVerifier(env),
  supabaseAdmin: createSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  storage: createStorageClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  logger,
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "arret en cours");
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: env.API_HOST, port: env.API_PORT });
