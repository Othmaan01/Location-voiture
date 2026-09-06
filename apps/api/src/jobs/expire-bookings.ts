import type { Logger } from "pino";

import type { BookingsService } from "../modules/bookings/service.js";

/**
 * Expiration des demandes sans reponse. Timer en processus pour le MVP ;
 * TECH DEBT : passer sur pg-boss quand il y aura plusieurs instances de l'API.
 */
export function startExpireBookingsJob(
  service: BookingsService,
  logger: Logger,
  intervalMs = 5 * 60 * 1000,
): () => void {
  const run = async () => {
    try {
      const n = await service.expireOverdue();
      if (n > 0) logger.info({ expired: n }, "demandes expirees");
    } catch (error) {
      logger.error({ err: error }, "job expiration en echec");
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
