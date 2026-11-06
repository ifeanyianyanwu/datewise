import { describe, expect, it } from "vitest";
import { CreatePlanRequest, Plan, UpdatePlanRequest } from "../src";

// Valletta, Malta. A minimal request: every required field, no "Shape it" constraints.
const validRequest = () => ({
  location: { lat: 35.8989, lng: 14.5146 },
  radiusMeters: 3000,
  theme: "foodie",
  durationMins: 180,
  startsAt: "2026-11-14T19:00:00+01:00",
  budget: { mode: "tier", tier: "$$" },
  travel: { mode: "walk" },
});

const withConstraints = (constraints: object, overrides: object = {}) => ({
  ...validRequest(),
  ...overrides,
  constraints,
});

describe("CreatePlanRequest", () => {
  it("accepts a minimal request without constraints", () => {
    expect(CreatePlanRequest.safeParse(validRequest()).success).toBe(true);
  });

  it("requires a travel mode, because it has no default", () => {
    const { travel: _, ...request } = validRequest();
    expect(CreatePlanRequest.safeParse(request).success).toBe(false);
  });

  describe("durationMins", () => {
    it.each([30, 45, 480])("accepts %i", (durationMins) => {
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), durationMins })
          .success,
      ).toBe(true);
    });

    it.each([15, 50, 495])(
      "rejects %i (below 30, not a multiple of 15, or above 480)",
      (durationMins) => {
        expect(
          CreatePlanRequest.safeParse({ ...validRequest(), durationMins })
            .success,
        ).toBe(false);
      },
    );
  });

  describe("budget", () => {
    it("accepts an amount in minor units with a currency", () => {
      const budget = {
        mode: "amount",
        amount: { amountMinor: 8000, currency: "EUR" },
      };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), budget }).success,
      ).toBe(true);
    });

    it("rejects a fractional amount, since money is stored in whole minor units", () => {
      const budget = {
        mode: "amount",
        amount: { amountMinor: 80.5, currency: "EUR" },
      };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), budget }).success,
      ).toBe(false);
    });

    it("rejects a currency that isn't an ISO 4217 code", () => {
      const budget = {
        mode: "amount",
        amount: { amountMinor: 8000, currency: "eur" },
      };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), budget }).success,
      ).toBe(false);
    });
  });

  describe("travel", () => {
    it("accepts transit by bus", () => {
      const travel = { mode: "transit", transitModes: ["bus"] };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), travel }).success,
      ).toBe(true);
    });

    it("rejects transit without any transit mode", () => {
      const travel = { mode: "transit", transitModes: [] };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), travel }).success,
      ).toBe(false);
    });

    it("rejects a transit mode listed twice", () => {
      const travel = { mode: "transit", transitModes: ["bus", "bus"] };
      expect(
        CreatePlanRequest.safeParse({ ...validRequest(), travel }).success,
      ).toBe(false);
    });
  });

  describe("constraints", () => {
    it("accepts a fully shaped evening", () => {
      const request = withConstraints({
        pinnedVenueIds: ["v1"],
        excludedCategories: ["bar"],
        slots: [{ kind: "activity" }, { kind: "dinner" }, { kind: "dessert" }],
        stops: 3,
        maxTravelMins: 15,
        note: "Anniversary, she loves live music",
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("trims the note", () => {
      const parsed = CreatePlanRequest.parse(
        withConstraints({ note: "  quiet places please  " }),
      );
      expect(parsed.constraints?.note).toBe("quiet places please");
    });

    it("rejects a note over 280 characters", () => {
      expect(
        CreatePlanRequest.safeParse(withConstraints({ note: "a".repeat(281) }))
          .success,
      ).toBe(false);
    });

    it("rejects an outline whose length doesn't match the number of stops", () => {
      const request = withConstraints({
        slots: [{ kind: "dinner" }, { kind: "dessert" }],
        stops: 3,
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("rejects more stops than the duration allows (15 minutes each)", () => {
      const request = withConstraints({ stops: 3 }, { durationMins: 30 });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("rejects a slot whose every category is excluded", () => {
      const request = withConstraints({
        slots: [{ kind: "dinner" }],
        excludedCategories: ["restaurant"],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("rejects more pinned venues than stops", () => {
      const request = withConstraints({
        pinnedVenueIds: ["v1", "v2", "v3"],
        stops: 2,
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("dinner can appear at most once in the evening outline", () => {
      const request = withConstraints({
        slots: [{ kind: "dinner" }, { kind: "activity" }, { kind: "dinner" }],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("points the dinner error at the second dinner", () => {
      const result = CreatePlanRequest.safeParse(
        withConstraints({ slots: [{ kind: "dinner" }, { kind: "activity" }, { kind: "dinner" }] }),
      );
      expect(result.error?.issues[0]?.path).toEqual(["constraints", "slots", 2]);
    });

    it("accepts other slots repeated, like two activities", () => {
      const request = withConstraints({
        slots: [{ kind: "activity" }, { kind: "dinner" }, { kind: "activity" }],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("accepts a shopping slot, for thrift and market dates", () => {
      const request = withConstraints({ slots: [{ kind: "shopping" }, { kind: "dinner" }] });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("rejects a shopping slot when every shop category is excluded", () => {
      const request = withConstraints({
        slots: [{ kind: "shopping" }],
        excludedCategories: ["second_hand", "market", "bookshop"],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("accepts asking for challenges", () => {
      const request = withConstraints({ challenges: true });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("rejects a challenges flag that isn't a boolean", () => {
      const request = withConstraints({ challenges: "yes" });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    describe("slot focus", () => {
      const firstIssuePath = (constraints: object) =>
        CreatePlanRequest.safeParse(withConstraints(constraints)).error?.issues[0]?.path;

      it("accepts an activity narrowed to workshops", () => {
        const request = withConstraints({
          slots: [{ kind: "activity", categories: ["workshop"] }, { kind: "dinner" }],
        });
        expect(CreatePlanRequest.safeParse(request).success).toBe(true);
      });

      it("rejects a bare slot name, the old format", () => {
        expect(firstIssuePath({ slots: ["activity"] })).toEqual(["constraints", "slots", 0]);
      });

      it("rejects a focus category that can't fill the slot", () => {
        expect(
          firstIssuePath({ slots: [{ kind: "activity", categories: ["restaurant"] }] }),
        ).toEqual(["constraints", "slots", 0, "categories", 0]);
      });

      it("rejects an empty focus list", () => {
        expect(firstIssuePath({ slots: [{ kind: "activity", categories: [] }] })).toEqual([
          "constraints",
          "slots",
          0,
          "categories",
        ]);
      });

      it("rejects a focus that lists a category twice", () => {
        expect(
          firstIssuePath({ slots: [{ kind: "activity", categories: ["games", "games"] }] }),
        ).toEqual(["constraints", "slots", 0, "categories"]);
      });

      it("rejects a narrowed slot whose focus is all excluded, even if other kinds remain", () => {
        expect(
          firstIssuePath({
            slots: [{ kind: "activity", categories: ["workshop"] }],
            excludedCategories: ["workshop"],
          }),
        ).toEqual(["constraints", "slots", 0]);
      });

      it("accepts bites three times in a row, for a crawl", () => {
        const request = withConstraints({
          slots: [{ kind: "bites" }, { kind: "bites" }, { kind: "bites" }],
        });
        expect(CreatePlanRequest.safeParse(request).success).toBe(true);
      });
    });
  });

  describe("ideaId", () => {
    it("accepts an idea from the catalog", () => {
      const request = { ...validRequest(), ideaId: "pottery-and-pasta" };
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("rejects an idea that isn't in the catalog", () => {
      const result = CreatePlanRequest.safeParse({ ...validRequest(), ideaId: "skydiving" });
      expect(result.error?.issues[0]?.path).toEqual(["ideaId"]);
    });
  });
});

describe("Plan", () => {
  const base = {
    id: "p1",
    name: "Friday in Valletta",
    input: validRequest(),
    parentPlanId: null,
    freeRerollAvailable: true,
    version: 1,
    createdAt: "2026-11-10T12:00:00Z",
    updatedAt: "2026-11-10T12:00:00Z",
  };

  it("accepts a queued plan with no result", () => {
    expect(Plan.safeParse({ ...base, status: "queued" }).success).toBe(true);
  });

  it("rejects a ready plan without a result", () => {
    expect(Plan.safeParse({ ...base, status: "ready" }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(Plan.safeParse({ ...base, status: "paused" }).success).toBe(false);
  });

  describe("challenges in a ready plan", () => {
    const thriftDare = {
      title: "Thrift dare",
      rules: "€15 each. Pick an outfit for the other person; they wear it to dinner.",
      spendCap: { amountMinor: 3000, currency: "EUR" },
    };
    const photoHunt = {
      title: "Photo hunt",
      rules: "Photograph five blue things before sunset. Best shot picks dessert.",
      spendCap: null,
    };

    const stop = (challenge: object | null) => ({
      venue: {
        venueId: "v1",
        name: "Second Chance Vintage",
        category: "second_hand",
        location: { lat: 35.8989, lng: 14.5146 },
      },
      slot: "shopping",
      startsAt: "2026-11-14T19:00:00+01:00",
      endsAt: "2026-11-14T20:00:00+01:00",
      reason: "Cheap racks and a changing room big enough for two",
      locked: false,
      estimatedCost: null,
      travelFromPrevious: null,
      challenge,
    });

    const readyPlan = (
      challenges: (object | null)[],
      input: object = validRequest(),
    ) => ({
      ...base,
      input,
      status: "ready",
      result: {
        stops: challenges.map(stop),
        weather: null,
        estimatedTotal: null,
      },
    });

    const asked = (overrides: object = {}) => ({
      ...withConstraints({ challenges: true }),
      ...overrides,
    });

    it("accepts a plan without challenges when none were asked for", () => {
      expect(Plan.safeParse(readyPlan([null])).success).toBe(true);
    });

    it("rejects a challenge nobody asked for", () => {
      const result = Plan.safeParse(readyPlan([photoHunt]));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual([
        "result",
        "stops",
        0,
        "challenge",
      ]);
    });

    it("accepts a challenge when asked for", () => {
      expect(Plan.safeParse(readyPlan([null, photoHunt], asked())).success).toBe(
        true,
      );
    });

    it("rejects a plan with no challenge when one was asked for", () => {
      const result = Plan.safeParse(readyPlan([null, null], asked()));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["result", "stops"]);
    });

    it("rejects a challenge with empty rules", () => {
      const challenge = { ...photoHunt, rules: "   " };
      expect(Plan.safeParse(readyPlan([challenge], asked())).success).toBe(
        false,
      );
    });

    describe("spend caps against an amount budget", () => {
      const budgetOf = (amountMinor: number, currency = "EUR") => ({
        budget: { mode: "amount", amount: { amountMinor, currency } },
      });

      it("accepts caps that fit inside the budget together", () => {
        const plan = readyPlan([thriftDare, thriftDare], asked(budgetOf(6000)));
        expect(Plan.safeParse(plan).success).toBe(true);
      });

      it("rejects caps that add up to more than the budget", () => {
        const plan = readyPlan([thriftDare, thriftDare], asked(budgetOf(5000)));
        const result = Plan.safeParse(plan);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(["result", "stops"]);
      });

      it("rejects a cap in a different currency from the budget", () => {
        const plan = readyPlan([thriftDare], asked(budgetOf(8000, "GBP")));
        const result = Plan.safeParse(plan);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual([
          "result",
          "stops",
          0,
          "challenge",
          "spendCap",
          "currency",
        ]);
      });
    });
  });
});

describe("UpdatePlanRequest", () => {
  it("accepts a batch of operations", () => {
    const request = {
      version: 3,
      ops: [
        { op: "lock", index: 0, locked: true },
        { op: "swap", index: 2, venueId: "v9" },
      ],
    };
    expect(UpdatePlanRequest.safeParse(request).success).toBe(true);
  });

  it("rejects an empty list of operations", () => {
    expect(UpdatePlanRequest.safeParse({ version: 3, ops: [] }).success).toBe(
      false,
    );
  });

  it("rejects an unknown operation", () => {
    expect(
      UpdatePlanRequest.safeParse({
        version: 3,
        ops: [{ op: "delete", index: 0 }],
      }).success,
    ).toBe(false);
  });
});
