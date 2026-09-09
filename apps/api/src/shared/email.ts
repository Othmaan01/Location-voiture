import type { Logger } from "pino";

/**
 * Passerelle e-mail (ADR-0018) : Resend derriere une interface minimale, sans SDK.
 * Sans cle, la passerelle est inerte : elle journalise et repond « non envoye ».
 */
export interface EmailMessage {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Uint8Array; contentType: string }[];
}
export interface EmailGateway {
  readonly enabled: boolean;
  send(message: EmailMessage): Promise<{ sent: boolean; id?: string }>;
}

export function createResendGateway(
  apiKey: string | undefined,
  from: string,
  logger: Logger,
): EmailGateway {
  if (!apiKey) {
    return {
      enabled: false,
      async send(message) {
        logger.info({ to: message.to, subject: message.subject }, "email non envoye (aucune cle)");
        return { sent: false };
      },
    };
  }
  return {
    enabled: true,
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: message.to,
          cc: message.cc,
          reply_to: message.replyTo,
          subject: message.subject,
          text: message.text,
          html: message.html,
          attachments: message.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content).toString("base64"),
            content_type: a.contentType,
          })),
        }),
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, "envoi e-mail refuse par Resend");
        return { sent: false };
      }
      const body = (await response.json()) as { id?: string };
      return { sent: true, ...(body.id ? { id: body.id } : {}) };
    },
  };
}
