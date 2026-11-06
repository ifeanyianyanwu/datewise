import type { AuthTokens, CreatePlanRequest, Plan, User } from "@datewise/shared";

// Sliema, Malta: where the mock's venues are.
export const SLIEMA = { lat: 35.9122, lng: 14.5042 };

export const tokens: AuthTokens = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  accessTokenExpiresAt: "2026-11-14T20:00:00Z",
};

export const user: User = {
  id: "u1",
  email: "ana@example.com",
  name: "Ana",
  timezone: "Europe/Malta",
  homeLocation: SLIEMA,
  currency: "EUR",
  creditBalance: 5,
  preferences: { favoriteThemes: [], dietaryNeeds: [], defaultBudget: null },
  createdAt: "2026-11-01T10:00:00Z",
};

export const planRequest: CreatePlanRequest = {
  location: SLIEMA,
  radiusMeters: 2000,
  theme: "cozy",
  durationMins: 180,
  startsAt: "2026-11-14T19:00:00+01:00",
  budget: { mode: "tier", tier: "$$" },
  travel: { mode: "walk" },
};

export const queuedPlan: Plan = {
  id: "p1",
  name: "Friday in Sliema",
  status: "queued",
  input: planRequest,
  parentPlanId: null,
  freeRerollAvailable: true,
  version: 0,
  createdAt: "2026-11-10T12:00:00Z",
  updatedAt: "2026-11-10T12:00:00Z",
};
