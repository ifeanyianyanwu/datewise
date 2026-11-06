import { z } from "zod";
import { Id } from "./common";
import { NearbyVenue } from "./venue";

const RetryAfter = z.object({ retryAfterSeconds: z.number().int().positive() });

// Every error response has this envelope. `code` is what the UI switches on;
// `message` is for people and may change.
export const ApiError = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("VALIDATION_FAILED"),
    message: z.string(),
    details: z.object({
      issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })),
    }),
  }),
  z.object({ code: z.literal("UNAUTHENTICATED"), message: z.string() }),
  z.object({ code: z.literal("FORBIDDEN"), message: z.string() }),
  z.object({ code: z.literal("NOT_FOUND"), message: z.string() }),
  z.object({
    code: z.literal("OUT_OF_CREDITS"),
    message: z.string(),
    details: z.object({ balance: z.number().int(), required: z.number().int().positive() }),
  }),
  z.object({
    code: z.literal("VERSION_CONFLICT"),
    message: z.string(),
    details: z.object({ currentVersion: z.number().int().nonnegative() }),
  }),
  z.object({ code: z.literal("IDEMPOTENCY_CONFLICT"), message: z.string() }),
  z.object({
    code: z.literal("VENUE_CLOSED"),
    message: z.string(),
    details: z.object({ venueId: Id, alternatives: z.array(NearbyVenue) }),
  }),
  z.object({ code: z.literal("RATE_LIMITED"), message: z.string(), details: RetryAfter }),
  z.object({ code: z.literal("AI_BUSY"), message: z.string(), details: RetryAfter }),
  z.object({ code: z.literal("INTERNAL"), message: z.string() }),
]);
export type ApiError = z.infer<typeof ApiError>;
export type ErrorCode = ApiError["code"];

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401, // no valid token: log in again
  OUT_OF_CREDITS: 402,
  FORBIDDEN: 403, // logged in, but not allowed (someone else's plan)
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409, // same Idempotency-Key, different body
  VENUE_CLOSED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  AI_BUSY: 503,
};
