import { z } from "zod";
import { Id, IsoDateTime, LatLng, VenueCategory } from "./common";

export const OpenStatus = z.enum(["open", "closed", "unknown"]);
export type OpenStatus = z.infer<typeof OpenStatus>;

export const Venue = z.object({
  id: Id,
  name: z.string(),
  category: VenueCategory,
  location: LatLng,
  address: z.string().nullable(),
});
export type Venue = z.infer<typeof Venue>;

export const NearbyVenue = Venue.extend({
  distanceMeters: z.number().int().nonnegative(),
  // Only present when the query has a time window.
  openStatus: OpenStatus.optional(),
});
export type NearbyVenue = z.infer<typeof NearbyVenue>;

// GET /venues/nearby. Query-string values are always strings, so numbers are coerced.
export const NearbyVenuesQuery = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().int().min(100).max(20_000),
    category: VenueCategory.optional(),
    openFrom: IsoDateTime.optional(),
    openUntil: IsoDateTime.optional(),
  })
  .superRefine(({ openFrom, openUntil }, ctx) => {
    if ((openFrom === undefined) !== (openUntil === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [openFrom === undefined ? "openFrom" : "openUntil"],
        message: "openFrom and openUntil must be sent together",
      });
    } else if (openFrom && openUntil && Date.parse(openUntil) <= Date.parse(openFrom)) {
      ctx.addIssue({ code: "custom", path: ["openUntil"], message: "openUntil must be after openFrom" });
    }
  });
export type NearbyVenuesQuery = z.infer<typeof NearbyVenuesQuery>;

export const NearbyVenuesResponse = z.object({ venues: z.array(NearbyVenue) });
export type NearbyVenuesResponse = z.infer<typeof NearbyVenuesResponse>;

// GET /venues/:id/availability
export const VenueAvailabilityQuery = z.object({
  startsAt: IsoDateTime,
  durationMins: z.coerce.number().int().min(15).max(480),
});
export type VenueAvailabilityQuery = z.infer<typeof VenueAvailabilityQuery>;

export const VenueAvailability = z.discriminatedUnion("status", [
  z.object({ venueId: Id, status: z.literal("open") }),
  // OpenStreetMap has no hours for this venue: allowed, with a warning.
  z.object({ venueId: Id, status: z.literal("unknown") }),
  z.object({ venueId: Id, status: z.literal("closed"), alternatives: z.array(NearbyVenue) }),
]);
export type VenueAvailability = z.infer<typeof VenueAvailability>;
