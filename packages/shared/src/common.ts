import { z } from "zod";

// IDs are opaque strings on the wire. MongoDB ObjectIds never leak to clients.
export const Id = z.string().min(1);

// JSON has no date type, so timestamps travel as ISO 8601 strings with an offset.
export const IsoDateTime = z.iso.datetime({ offset: true });

// The wire uses { lat, lng }. GeoJSON's [lng, lat] order stays inside the API.
export const LatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLng>;

// ISO 4217, e.g. "EUR". Clients detect the user's currency from their location;
// when that fails, the server falls back to this.
export const DEFAULT_CURRENCY = "EUR";
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 code like EUR");

// Money is an integer in the currency's minor unit (cents for EUR), never a float.
export const Money = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencyCode,
});
export type Money = z.infer<typeof Money>;

export const Theme = z.enum(["cozy", "adventurous", "foodie", "budget"]);
export type Theme = z.infer<typeof Theme>;

export const VenueCategory = z.enum([
  "restaurant",
  "cafe",
  "bar",
  "dessert",
  "museum",
  "gallery",
  "park",
  "viewpoint",
  "cinema",
  "live_music",
  "activity",
]);
export type VenueCategory = z.infer<typeof VenueCategory>;

// A slot in the evening outline, and the venue categories that can fill it.
export const SlotKind = z.enum(["activity", "dinner", "drinks", "dessert"]);
export type SlotKind = z.infer<typeof SlotKind>;

export const SLOT_CATEGORIES: Record<SlotKind, readonly VenueCategory[]> = {
  activity: ["museum", "gallery", "park", "viewpoint", "cinema", "live_music", "activity"],
  dinner: ["restaurant"],
  drinks: ["bar", "live_music"],
  dessert: ["dessert", "cafe"],
};

export const TravelMode = z.enum(["walk", "drive", "transit"]);
export type TravelMode = z.infer<typeof TravelMode>;

export const TransitMode = z.enum(["bus", "train"]);
export type TransitMode = z.infer<typeof TransitMode>;

// Cursor pagination for lists that grow without limit (plans, ledger entries).
export const page = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
