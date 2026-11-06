import { z } from "zod";
import { CurrencyCode, IsoDateTime } from "./common";
import { Timezone, User } from "./user";

// bcrypt only reads the first 72 bytes, so anything longer would be silently truncated.
// Bytes, not characters: "é" is two bytes in UTF-8.
const Password = z
  .string()
  .min(8)
  .refine((password) => new TextEncoder().encode(password).length <= 72, "Password must be at most 72 bytes");

// POST /auth/signup. `currency` is what the client detected from the user's location;
// without it the server uses DEFAULT_CURRENCY.
export const SignupRequest = z.object({
  email: z.email(),
  password: Password,
  name: z.string().trim().min(1).max(60),
  timezone: Timezone,
  currency: CurrencyCode.optional(),
});
export type SignupRequest = z.infer<typeof SignupRequest>;

// POST /auth/login
export const LoginRequest = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

// POST /auth/refresh and POST /auth/logout
export const RefreshRequest = z.object({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: IsoDateTime,
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const AuthResponse = z.object({ user: User, tokens: AuthTokens });
export type AuthResponse = z.infer<typeof AuthResponse>;
