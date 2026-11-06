import { z } from "zod";
import { BudgetTier, DurationMins, MIN_MINS_PER_STOP, Slot, Theme, VenueCategory } from "./common";

// An idea is a preset for the plan form: a vibe, an outline, challenges on or off, and a
// suggested length and budget. The catalog is fixed and ships with the contract, so the
// client can show ideas offline and send only an id; GET /ideas adds what's nearby.

export const IdeaFamily = z.enum(["classic", "make", "play", "outdoors", "explore", "lowkey"]);
export type IdeaFamily = z.infer<typeof IdeaFamily>;

// Listed once here so the id is a closed set: a request naming any other idea fails to parse.
const IDEA_IDS = [
  "dinner-and-a-show",
  "drinks-with-a-view",
  "long-dinner-short-walk",
  "pottery-and-pasta",
  "paint-and-sip",
  "cook-it-then-eat-it",
  "arcade-and-ice-cream",
  "escape-the-room",
  "karaoke-duet",
  "market-picnic",
  "beach-and-bites",
  "sunset-chase",
  "thrift-dare",
  "photo-hunt",
  "bookshop-crawl",
  "street-food-crawl",
  "errands-but-a-date",
  "coffee-and-a-walk",
] as const;
export const IdeaId = z.enum(IDEA_IDS);
export type IdeaId = z.infer<typeof IdeaId>;

export const Idea = z
  .object({
    id: IdeaId,
    family: IdeaFamily,
    name: z.string().min(1).max(40),
    blurb: z.string().min(1).max(200),
    theme: Theme,
    slots: z.array(Slot).min(1).max(4),
    challenges: z.boolean(),
    // Trusted text from this catalog, which the API adds to the prompt. Unlike the user's
    // note, it never comes from the client: the request only carries the idea's id.
    challengeHint: z.string().min(1).max(140).nullable(),
    durationMins: DurationMins,
    budgetTier: BudgetTier,
    bookAhead: z.boolean(),
  })
  .superRefine(({ slots, durationMins, challenges, challengeHint }, ctx) => {
    if (slots.length * MIN_MINS_PER_STOP > durationMins) {
      ctx.addIssue({
        code: "custom",
        path: ["slots"],
        message: `${slots.length} stops don't fit in ${durationMins} minutes`,
      });
    }
    if (challenges !== (challengeHint !== null)) {
      ctx.addIssue({
        code: "custom",
        path: ["challengeHint"],
        message: challenges ? "An idea with challenges needs a hint" : "A hint needs challenges turned on",
      });
    }
  });
export type Idea = z.infer<typeof Idea>;

export const IDEAS: readonly Idea[] = [
  // Classic: the familiar date, plus a second act.
  {
    id: "dinner-and-a-show",
    family: "classic",
    name: "Dinner and a show",
    blurb: "Eat first, then a gig, a play or a film, so there's something to talk about on the way home.",
    theme: "foodie",
    slots: [{ kind: "dinner" }, { kind: "activity", categories: ["live_music", "theatre", "cinema"] }],
    challenges: false,
    challengeHint: null,
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: true,
  },
  {
    id: "drinks-with-a-view",
    family: "classic",
    name: "Drinks with a view",
    blurb: "Catch the light somewhere high, then a bar close by.",
    theme: "cozy",
    slots: [{ kind: "activity", categories: ["viewpoint"] }, { kind: "drinks" }],
    challenges: false,
    challengeHint: null,
    durationMins: 120,
    budgetTier: "$$",
    bookAhead: false,
  },
  {
    id: "long-dinner-short-walk",
    family: "classic",
    name: "Long dinner, short walk",
    blurb: "A slow dinner, a walk to stretch it out, and something sweet to finish.",
    theme: "cozy",
    slots: [{ kind: "dinner" }, { kind: "activity", categories: ["park", "viewpoint"] }, { kind: "dessert" }],
    challenges: false,
    challengeHint: null,
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: false,
  },

  // Make something: learning side by side takes the interview feel out of a date.
  {
    id: "pottery-and-pasta",
    family: "make",
    name: "Pottery and pasta",
    blurb: "Throw clay side by side, then go somewhere warm to eat while it dries.",
    theme: "cozy",
    slots: [{ kind: "activity", categories: ["workshop"] }, { kind: "dinner" }],
    challenges: true,
    challengeHint: "Make each other a cup. No peeking at each other's wheel until both are done.",
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: true,
  },
  {
    id: "paint-and-sip",
    family: "make",
    name: "Paint and sip",
    blurb: "A painting class, then a drink to judge the results.",
    theme: "cozy",
    slots: [{ kind: "activity", categories: ["workshop"] }, { kind: "drinks" }],
    challenges: true,
    challengeHint: "Paint each other in twenty minutes, then swap canvases.",
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: true,
  },
  {
    id: "cook-it-then-eat-it",
    family: "make",
    name: "Cook it, then eat it",
    blurb: "A cooking class where dinner is what you make, with dessert somewhere after.",
    theme: "foodie",
    slots: [{ kind: "activity", categories: ["workshop"] }, { kind: "dessert" }],
    challenges: false,
    challengeHint: null,
    durationMins: 180,
    budgetTier: "$$$",
    bookAhead: true,
  },

  // Play: friendly competition.
  {
    id: "arcade-and-ice-cream",
    family: "play",
    name: "Arcade and ice cream",
    blurb: "Games first, dessert after, and the score decides who pays.",
    theme: "adventurous",
    slots: [{ kind: "activity", categories: ["games"] }, { kind: "dessert", categories: ["dessert"] }],
    challenges: true,
    challengeHint: "Best of three games. The loser buys dessert.",
    durationMins: 120,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "escape-the-room",
    family: "play",
    name: "Escape the room",
    blurb: "An hour of puzzles as a team, then a drink to replay it.",
    theme: "adventurous",
    slots: [{ kind: "activity", categories: ["games"] }, { kind: "drinks" }],
    challenges: false,
    challengeHint: null,
    durationMins: 150,
    budgetTier: "$$",
    bookAhead: true,
  },
  {
    id: "karaoke-duet",
    family: "play",
    name: "Karaoke duet",
    blurb: "Dinner for courage, then a private room and a microphone each.",
    theme: "adventurous",
    slots: [{ kind: "dinner" }, { kind: "activity", categories: ["games"] }],
    challenges: true,
    challengeHint: "Pick each other's song. No vetoes.",
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: false,
  },

  // Outdoors.
  {
    id: "market-picnic",
    family: "outdoors",
    name: "Market picnic",
    blurb: "Shop a market for a picnic, then find a spot in the park to eat it.",
    theme: "budget",
    slots: [{ kind: "shopping", categories: ["market"] }, { kind: "activity", categories: ["park"] }],
    challenges: true,
    challengeHint: "Build the best picnic you can within a spending cap.",
    durationMins: 180,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "beach-and-bites",
    family: "outdoors",
    name: "Beach and bites",
    blurb: "An afternoon by the water and something to eat on the way back.",
    theme: "adventurous",
    slots: [{ kind: "activity", categories: ["beach"] }, { kind: "bites" }],
    challenges: false,
    challengeHint: null,
    durationMins: 240,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "sunset-chase",
    family: "outdoors",
    name: "Sunset chase",
    blurb: "Get somewhere high before sunset, then eat once the light is gone.",
    theme: "adventurous",
    slots: [{ kind: "activity", categories: ["viewpoint"] }, { kind: "bites" }],
    challenges: true,
    challengeHint: "Take three photos of the same view, ten minutes apart.",
    durationMins: 120,
    budgetTier: "$",
    bookAhead: false,
  },

  // Explore: novelty on a budget, usually with a challenge.
  {
    id: "thrift-dare",
    family: "explore",
    name: "Thrift dare",
    blurb: "Dress each other from the second-hand racks, then show it off at dinner.",
    theme: "budget",
    slots: [{ kind: "shopping", categories: ["second_hand"] }, { kind: "dinner" }],
    challenges: true,
    challengeHint: "Pick a full outfit for each other within a spending cap. Wear one piece to dinner.",
    durationMins: 180,
    budgetTier: "$$",
    bookAhead: false,
  },
  {
    id: "photo-hunt",
    family: "explore",
    name: "Photo hunt",
    blurb: "A list of shots to find together outdoors, and dessert for the winner.",
    theme: "budget",
    slots: [{ kind: "activity", categories: ["park", "viewpoint"] }, { kind: "dessert" }],
    challenges: true,
    challengeHint: "Five things to photograph together. The best shot picks dessert.",
    durationMins: 120,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "bookshop-crawl",
    family: "explore",
    name: "Bookshop crawl",
    blurb: "Two bookshops and a café to read the first pages in.",
    theme: "cozy",
    slots: [
      { kind: "shopping", categories: ["bookshop"] },
      { kind: "shopping", categories: ["bookshop"] },
      { kind: "dessert", categories: ["cafe"] },
    ],
    challenges: true,
    challengeHint: "Pick a book for each other within a spending cap.",
    durationMins: 180,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "street-food-crawl",
    family: "explore",
    name: "Street food crawl",
    blurb: "Three stops, one bite each, walking between them.",
    theme: "budget",
    slots: [{ kind: "bites" }, { kind: "bites" }, { kind: "bites" }],
    challenges: true,
    challengeHint: "Score every bite out of ten. The winner picks the next date.",
    durationMins: 120,
    budgetTier: "$",
    bookAhead: false,
  },

  // Low-key: short, cheap, no pressure.
  {
    id: "errands-but-a-date",
    family: "lowkey",
    name: "Errands, but a date",
    blurb: "Do the market run together, then sit down for a coffee.",
    theme: "budget",
    slots: [{ kind: "shopping", categories: ["market"] }, { kind: "dessert", categories: ["cafe"] }],
    challenges: true,
    challengeHint: "Each of you sneaks one surprise into the basket.",
    durationMins: 90,
    budgetTier: "$",
    bookAhead: false,
  },
  {
    id: "coffee-and-a-walk",
    family: "lowkey",
    name: "Coffee and a walk",
    blurb: "The easy first date: a coffee to go and a walk in the park.",
    theme: "cozy",
    slots: [{ kind: "dessert", categories: ["cafe"] }, { kind: "activity", categories: ["park"] }],
    challenges: false,
    challengeHint: null,
    durationMins: 60,
    budgetTier: "$",
    bookAhead: false,
  },
];

// ---- GET /ideas?lat&lng&radius ----

export const IdeasQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(100).max(20_000),
});
export type IdeasQuery = z.infer<typeof IdeasQuery>;

// What's nearby for one idea. Clients join this with IDEAS by id.
export const IdeaNearby = z.object({
  ideaId: IdeaId,
  // Every slot in the idea's outline has at least one place nearby that can fill it.
  available: z.boolean(),
  // The headline number on the card, e.g. 4 workshops for "Pottery and pasta".
  highlight: z.object({ category: VenueCategory, count: z.number().int().nonnegative() }),
});
export type IdeaNearby = z.infer<typeof IdeaNearby>;

export const IdeasResponse = z.object({ ideas: z.array(IdeaNearby) });
export type IdeasResponse = z.infer<typeof IdeasResponse>;
