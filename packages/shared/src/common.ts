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
  // Thrift, charity and vintage shops (OSM shop=second_hand, shop=charity).
  "second_hand",
  "market",
  "bookshop",
  // Classes you take together: pottery, painting, cooking.
  "workshop",
  // Arcades, bowling, escape rooms, karaoke, mini golf.
  "games",
  // Theatre and comedy.
  "theatre",
  "beach",
  // Stalls, kiosks and fast food: the stops of a food crawl.
  "street_food",
]);
export type VenueCategory = z.infer<typeof VenueCategory>;

// Kinds of place that usually need a booking. Datewise doesn't book, so the UI says so instead.
export const BOOK_AHEAD_CATEGORIES: readonly VenueCategory[] = ["workshop", "theatre"];

// A slot in the outline, and the venue categories that can fill it.
export const SlotKind = z.enum(["activity", "shopping", "bites", "dinner", "drinks", "dessert"]);
export type SlotKind = z.infer<typeof SlotKind>;

export const SLOT_CATEGORIES: Record<SlotKind, readonly VenueCategory[]> = {
  activity: [
    "museum",
    "gallery",
    "park",
    "viewpoint",
    "cinema",
    "live_music",
    "activity",
    "workshop",
    "games",
    "theatre",
    "beach",
  ],
  shopping: ["second_hand", "market", "bookshop"],
  // Small plates. Unlike dinner, bites can repeat, which is what makes a crawl.
  bites: ["street_food", "cafe", "dessert", "market"],
  dinner: ["restaurant"],
  drinks: ["bar", "live_music"],
  dessert: ["dessert", "cafe"],
};

// A slot in the outline, optionally narrowed to some of the categories that can fill it
// ("an activity, but a workshop").
export const Slot = z
  .object({
    kind: SlotKind,
    categories: z.array(VenueCategory).min(1).optional(),
  })
  .superRefine(({ kind, categories }, ctx) => {
    if (!categories) return;
    categories.forEach((category, index) => {
      if (!SLOT_CATEGORIES[kind].includes(category)) {
        ctx.addIssue({
          code: "custom",
          path: ["categories", index],
          message: `A ${category} can't fill a ${kind} slot`,
        });
      }
    });
    if (new Set(categories).size !== categories.length) {
      ctx.addIssue({ code: "custom", path: ["categories"], message: "Each category can only be listed once" });
    }
  });
export type Slot = z.infer<typeof Slot>;

// The categories that may fill a slot: its focus when it has one, otherwise every category of its kind.
export const slotCategories = (slot: Slot): readonly VenueCategory[] =>
  slot.categories ?? SLOT_CATEGORIES[slot.kind];

// Clients offer presets and a custom picker; the contract only sees minutes.
export const DurationMins = z.number().int().min(30).max(480).multipleOf(15);

// Each stop needs at least this long, so a 30-minute date fits two stops at most.
export const MIN_MINS_PER_STOP = 15;

export const BudgetTier = z.enum(["$", "$$", "$$$"]);
export type BudgetTier = z.infer<typeof BudgetTier>;

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
