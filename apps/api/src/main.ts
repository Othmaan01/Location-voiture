import { createDatabase } from "./db/client.js";
import { startExpireBookingsJob } from "./jobs/expire-bookings.js";
import { createBookingsService } from "./modules/bookings/service.js";
import {
  createExpoPushSender,
  createNotificationsService,
} from "./modules/notifications/service.js";
import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";
import { createTokenVerifier } from "./shared/auth.js";
import { createStripeGateway } from "./shared/billing.js";
import { createResendGateway } from "./shared/email.js";
import { createLogger } from "./shared/logger.js";
import { createStorageClient } from "./shared/storage.js";
import { createSupabaseAdmin } from "./shared/supabase-admin.js";

const env = loadEnv();
const logger = createLogger(env.API_LOG_LEVEL, env.NODE_ENV === "development");
const database = createDatabase(env.DATABASE_URL);
const storage = createStorageClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const notifications = createNotificationsService(database.db, createExpoPushSender(logger));

const app = await buildServer({
  env,
  db: database.db,
  verifyToken: createTokenVerifier(env),
  supabaseAdmin: createSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  storage,
  notifications,
  email: createResendGateway(env.RESEND_API_KEY, env.EMAIL_FROM, logger),
  billing: env.STRIPE_SECRET_KEY
    ? createStripeGateway(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)
    : null,
  logger,
});
if (!env.STRIPE_SECRET_KEY)
  logger.warn("facturation : aucune cle Stripe, paiement en ligne desactive");

const stopJobs = startExpireBookingsJob(
  createBookingsService(database.db, storage, notifications),
  logger,
);

const shutdown = async (signal: string) => {
  stopJobs();
  logger.info({ signal }, "arret en cours");
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: env.API_HOST, port: env.API_PORT });
