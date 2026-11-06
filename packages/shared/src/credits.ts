import { z } from "zod";
import { Id, IsoDateTime, Money } from "./common";

export const LedgerReason = z.enum(["signup", "monthly_grant", "purchase", "plan", "reroll", "refund"]);
export type LedgerReason = z.infer<typeof LedgerReason>;

// Append-only. The balance is the sum of every entry's delta.
export const LedgerEntry = z.object({
  id: Id,
  delta: z.number().int(),
  reason: LedgerReason,
  refId: z.string(),
  createdAt: IsoDateTime,
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

// GET /credits
export const CreditsResponse = z.object({
  balance: z.number().int().nonnegative(),
  entries: z.array(LedgerEntry),
});
export type CreditsResponse = z.infer<typeof CreditsResponse>;

export const CreditPack = z.object({
  id: Id,
  credits: z.number().int().positive(),
  price: Money,
});
export type CreditPack = z.infer<typeof CreditPack>;

// POST /credits/checkout
export const CheckoutRequest = z.object({ packId: Id });
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const CheckoutResponse = z.object({
  paymentId: Id,
  checkoutUrl: z.url(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponse>;
