import { z } from "zod";
import { CurrencyCode, Id, IsoDateTime, LatLng, Theme } from "./common";
import { Budget } from "./plan";

// An IANA zone such as "Europe/Malta". The API checks it against the zone database.
export const Timezone = z.string().min(1);

export const Preferences = z.object({
  favoriteThemes: z.array(Theme),
  dietaryNeeds: z.array(z.string().trim().min(1).max(40)).max(10),
  defaultBudget: Budget.nullable(),
});
export type Preferences = z.infer<typeof Preferences>;

// GET /me
export const User = z.object({
  id: Id,
  email: z.email(),
  name: z.string(),
  timezone: Timezone,
  homeLocation: LatLng.nullable(),
  currency: CurrencyCode,
  creditBalance: z.number().int().nonnegative(),
  preferences: Preferences,
  createdAt: IsoDateTime,
});
export type User = z.infer<typeof User>;

// PATCH /me
export const UpdateMeRequest = User.pick({
  name: true,
  timezone: true,
  homeLocation: true,
  currency: true,
  preferences: true,
}).partial();
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;
