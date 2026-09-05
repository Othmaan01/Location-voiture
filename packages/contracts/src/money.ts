import { z } from "zod";

/** Devises acceptees. Etendre ici, jamais par une chaine libre. */
export const CurrencySchema = z.enum(["EUR"]);
export type Currency = z.infer<typeof CurrencySchema>;

/**
 * Montant monetaire : entier dans la plus petite unite (centimes) + devise.
 * Aucun flottant, jamais (ADR-0004).
 */
export const MoneySchema = z
  .object({
    cents: z.number().int().min(0),
    currency: CurrencySchema,
  })
  .strict();
export type Money = z.infer<typeof MoneySchema>;

/** Montant signe (remboursement, ajustement). Reserve aux ecritures internes. */
export const SignedMoneySchema = MoneySchema.extend({ cents: z.number().int() }).strict();
export type SignedMoney = z.infer<typeof SignedMoneySchema>;
