import { z } from "zod";
import {
  Id,
  IsoDateTime,
  LatLng,
  Money,
  page,
  SLOT_CATEGORIES,
  SlotKind,
  Theme,
  TransitMode,
  TravelMode,
  VenueCategory,
} from "./common";

// ---- Request ----

export const Budget = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("tier"), tier: z.enum(["$", "$$", "$$$"]) }),
  z.object({ mode: z.literal("amount"), amount: Money }),
]);
export type Budget = z.infer<typeof Budget>;

// Clients offer presets and a custom picker; the contract only sees minutes.
export const DurationMins = z.number().int().min(30).max(480).multipleOf(15);

// Required, with no default: the user always picks how they get around.
export const Travel = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("walk") }),
  z.object({ mode: z.literal("drive") }),
  z.object({
    mode: z.literal("transit"),
    transitModes: z
      .array(TransitMode)
      .min(1)
      .refine((modes) => new Set(modes).size === modes.length, "Each transit mode can only be listed once"),
  }),
]);
export type Travel = z.infer<typeof Travel>;

// "Shape it": every field is optional.
export const PlanConstraints = z.object({
  pinnedVenueIds: z.array(Id).max(4).optional(),
  excludedCategories: z.array(VenueCategory).optional(),
  slots: z.array(SlotKind).min(1).max(4).optional(),
  stops: z.number().int().min(1).max(4).optional(),
  maxTravelMins: z.number().int().min(5).max(60).optional(),
  // Untrusted user text. The API puts it in a delimited prompt section as a preference.
  note: z.string().trim().max(280).optional(),
});
export type PlanConstraints = z.infer<typeof PlanConstraints>;

// Each stop needs at least this long, so a 30-minute date fits two stops at most.
export const MIN_MINS_PER_STOP = 15;

// POST /plans. Also stored on the plan as its `input`.
// Rules that need more than one field live in superRefine. Rules that need venue data
// (a pinned venue is open, isn't in an excluded category) can only run in the API.
export const CreatePlanRequest = z
  .object({
    location: LatLng,
    radiusMeters: z.number().int().min(100).max(20_000),
    theme: Theme,
    durationMins: DurationMins,
    startsAt: IsoDateTime,
    budget: Budget,
    travel: Travel,
    constraints: PlanConstraints.optional(),
  })
  .superRefine(({ durationMins, constraints }, ctx) => {
    if (!constraints) return;
    const { slots, stops, pinnedVenueIds, excludedCategories } = constraints;

    if (slots && stops !== undefined && slots.length !== stops) {
      ctx.addIssue({
        code: "custom",
        path: ["constraints", "slots"],
        message: `The outline has ${slots.length} slots but the pace asks for ${stops} stops`,
      });
    }

    const stopCount = stops ?? slots?.length;
    const maxStops = Math.floor(durationMins / MIN_MINS_PER_STOP);
    if (stopCount !== undefined && stopCount > maxStops) {
      ctx.addIssue({
        code: "custom",
        path: ["constraints", "stops"],
        message: `${durationMins} minutes fits at most ${maxStops} stops`,
      });
    }

    if (pinnedVenueIds && stopCount !== undefined && pinnedVenueIds.length > stopCount) {
      ctx.addIssue({
        code: "custom",
        path: ["constraints", "pinnedVenueIds"],
        message: `${pinnedVenueIds.length} pinned places won't fit in ${stopCount} stops`,
      });
    }

    if (slots && excludedCategories) {
      slots.forEach((slot, index) => {
        if (SLOT_CATEGORIES[slot].every((category) => excludedCategories.includes(category))) {
          ctx.addIssue({
            code: "custom",
            path: ["constraints", "slots", index],
            message: `Every kind of place that fits "${slot}" is excluded`,
          });
        }
      });
    }
  });
export type CreatePlanRequest = z.infer<typeof CreatePlanRequest>;

// ---- Result ----

export const VenueSnapshot = z.object({
  venueId: Id,
  name: z.string(),
  category: VenueCategory,
  location: LatLng,
});
export type VenueSnapshot = z.infer<typeof VenueSnapshot>;

export const TransitStep = z.object({
  vehicle: TransitMode,
  line: z.string(),
  headsign: z.string().nullable(),
  fromStop: z.string(),
  toStop: z.string(),
  departAt: IsoDateTime,
  arriveAt: IsoDateTime,
  stopCount: z.number().int().nonnegative(),
});
export type TransitStep = z.infer<typeof TransitStep>;

export const Leg = z.object({
  mode: TravelMode,
  durationMins: z.number().int().nonnegative(),
  distanceMeters: z.number().int().nonnegative(),
  // "estimate" means straight-line distance at an average speed, not a real route.
  source: z.enum(["provider", "estimate"]),
  summary: z.string().optional(),
  transitSteps: z.array(TransitStep).optional(),
});
export type Leg = z.infer<typeof Leg>;

export const Stop = z.object({
  venue: VenueSnapshot,
  slot: SlotKind.nullable(),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  reason: z.string(),
  locked: z.boolean(),
  estimatedCost: Money.nullable(),
  // null for the first stop.
  travelFromPrevious: Leg.nullable(),
});
export type Stop = z.infer<typeof Stop>;

export const WeatherSummary = z.object({
  condition: z.enum(["clear", "cloudy", "rain", "snow", "storm", "fog"]),
  summary: z.string(),
  tempMinC: z.number(),
  tempMaxC: z.number(),
  precipitationChance: z.number().min(0).max(1),
});
export type WeatherSummary = z.infer<typeof WeatherSummary>;

export const PlanResult = z.object({
  stops: z.array(Stop).min(1).max(4),
  weather: WeatherSummary.nullable(),
  estimatedTotal: Money.nullable(),
});
export type PlanResult = z.infer<typeof PlanResult>;

export const PlanProgress = z.object({
  step: z.enum(["fetching_venues", "checking_weather", "arranging", "validating"]),
  // The places being considered, shown outlined in blue while generating.
  candidates: z.array(VenueSnapshot),
});
export type PlanProgress = z.infer<typeof PlanProgress>;

export const PlanFailure = z.object({
  code: z.enum(["AI_BUSY", "CONSTRAINTS_UNSATISFIABLE", "PROVIDER_FAILED", "INTERNAL"]),
  message: z.string(),
  refunded: z.boolean(),
});
export type PlanFailure = z.infer<typeof PlanFailure>;

// ---- Plan ----

const planBase = z.object({
  id: Id,
  name: z.string(),
  input: CreatePlanRequest,
  // Set on revisions created by a reroll.
  parentPlanId: Id.nullable(),
  freeRerollAvailable: z.boolean(),
  // Optimistic concurrency: PATCH must send the version it read.
  version: z.number().int().nonnegative(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

// A discriminated union: each status carries exactly the fields that exist in it.
export const Plan = z.discriminatedUnion("status", [
  planBase.extend({ status: z.literal("queued") }),
  planBase.extend({ status: z.literal("generating"), progress: PlanProgress }),
  planBase.extend({ status: z.literal("ready"), result: PlanResult }),
  planBase.extend({ status: z.literal("failed"), failure: PlanFailure }),
  planBase.extend({ status: z.literal("cancelled") }),
]);
export type Plan = z.infer<typeof Plan>;
export type PlanStatus = Plan["status"];

// POST /plans responds with the plan: `ready` while generation is synchronous
// (week 2), `queued` with a 202 once it moves to a queue (week 3).
export const CreatePlanResponse = Plan;
export type CreatePlanResponse = Plan;

// GET /plans
export const PlanSummary = z.object({
  id: Id,
  name: z.string(),
  status: z.enum(["queued", "generating", "ready", "failed", "cancelled"]),
  theme: Theme,
  startsAt: IsoDateTime,
  parentPlanId: Id.nullable(),
  revisionCount: z.number().int().nonnegative(),
  createdAt: IsoDateTime,
});
export type PlanSummary = z.infer<typeof PlanSummary>;

export const ListPlansResponse = page(PlanSummary);
export type ListPlansResponse = z.infer<typeof ListPlansResponse>;

// ---- Edits ----

const StopIndex = z.number().int().min(0).max(3);

export const PlanEdit = z.discriminatedUnion("op", [
  z.object({ op: z.literal("rename"), name: z.string().trim().min(1).max(80) }),
  z.object({ op: z.literal("move"), from: StopIndex, to: StopIndex }),
  z.object({ op: z.literal("retime"), index: StopIndex, startsAt: IsoDateTime }),
  z.object({ op: z.literal("lock"), index: StopIndex, locked: z.boolean() }),
  z.object({ op: z.literal("swap"), index: StopIndex, venueId: Id }),
]);
export type PlanEdit = z.infer<typeof PlanEdit>;

// PATCH /plans/:id. Applied all-or-nothing; a stale version gets 409.
export const UpdatePlanRequest = z.object({
  version: z.number().int().nonnegative(),
  ops: z.array(PlanEdit).min(1),
});
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequest>;

// GET /plans/:id/stops/:index/alternatives
export const Alternative = z.object({
  venue: VenueSnapshot,
  distanceMeters: z.number().int().nonnegative(),
  // Compared with the current stop; negative means the swap saves time.
  extraTravelMins: z.number().int(),
  closesAt: IsoDateTime.nullable(),
});
export type Alternative = z.infer<typeof Alternative>;

export const AlternativesResponse = z.object({ alternatives: z.array(Alternative) });
export type AlternativesResponse = z.infer<typeof AlternativesResponse>;
