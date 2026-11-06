import { describe, expect, it } from "vitest";
import { CreatePlanRequest, Idea, IDEAS, IdeaFamily, IdeasQuery, MIN_MINS_PER_STOP } from "../src";

// A request built from an idea the way the plan form fills itself in:
// the place and time come from the user, everything else from the idea.
const requestFrom = (idea: Idea) => ({
  location: { lat: 6.4474, lng: 3.4723 },
  radiusMeters: 5000,
  startsAt: "2026-11-21T15:00:00+01:00",
  travel: { mode: "drive" },
  ideaId: idea.id,
  theme: idea.theme,
  durationMins: idea.durationMins,
  budget: { mode: "tier", tier: idea.budgetTier },
  constraints: { slots: idea.slots, challenges: idea.challenges },
});

const pottery = (): Idea => structuredClone(IDEAS.find((idea) => idea.id === "pottery-and-pasta")!);

describe("IDEAS, the catalog", () => {
  it("has eighteen ideas, at least two of each kind", () => {
    expect(IDEAS).toHaveLength(18);
    for (const family of IdeaFamily.options) {
      expect(IDEAS.filter((idea) => idea.family === family).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses each id once", () => {
    expect(new Set(IDEAS.map((idea) => idea.id)).size).toBe(IDEAS.length);
  });

  it.each(IDEAS.map((idea) => [idea.id, idea] as const))("%s is a valid idea", (_, idea) => {
    expect(Idea.safeParse(idea).success).toBe(true);
  });

  it.each(IDEAS.map((idea) => [idea.id, idea] as const))(
    "%s fills in a valid plan request",
    (_, idea) => {
      expect(CreatePlanRequest.safeParse(requestFrom(idea)).success).toBe(true);
    },
  );
});

describe("Idea", () => {
  it("rejects an outline that doesn't fit the duration", () => {
    const idea = { ...pottery(), durationMins: 30, slots: [{ kind: "activity" }, { kind: "dinner" }, { kind: "dessert" }] };
    const result = Idea.safeParse(idea);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["slots"]);
    expect(MIN_MINS_PER_STOP * 3).toBeGreaterThan(30);
  });

  it("rejects a challenge hint when challenges are off", () => {
    const result = Idea.safeParse({ ...pottery(), challenges: false });
    expect(result.error?.issues[0]?.path).toEqual(["challengeHint"]);
  });

  it("rejects challenges without a hint", () => {
    const result = Idea.safeParse({ ...pottery(), challengeHint: null });
    expect(result.error?.issues[0]?.path).toEqual(["challengeHint"]);
  });
});

describe("IdeasQuery", () => {
  it("coerces query-string values to numbers", () => {
    expect(IdeasQuery.parse({ lat: "6.4474", lng: "3.4723", radius: "5000" })).toEqual({
      lat: 6.4474,
      lng: 3.4723,
      radius: 5000,
    });
  });
});
