import pino, { type Logger } from "pino";

/**
 * Logger structure. Les champs sensibles sont masques par configuration :
 * aucun token, mot de passe, document ou en-tete d'autorisation ne doit
 * apparaitre dans un log, meme en debug.
 */
export function createLogger(level: string, pretty: boolean): Logger {
  return pino({
    level,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["idempotency-key"]',
        "*.password",
        "*.token",
        "*.refresh_token",
        "*.access_token",
        "*.secret",
        "*.siret",
        "*.phone",
        "*.email",
      ],
      censor: "[redacted]",
    },
    ...(pretty ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
  });
}
