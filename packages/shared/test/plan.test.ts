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
        slots: ["activity", "dinner", "dessert"],
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
        slots: ["dinner", "dessert"],
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
        slots: ["dinner"],
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
        slots: ["dinner", "activity", "dinner"],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
    });

    it("points the dinner error at the second dinner", () => {
      const result = CreatePlanRequest.safeParse(
        withConstraints({ slots: ["dinner", "activity", "dinner"] }),
      );
      expect(result.error?.issues[0]?.path).toEqual(["constraints", "slots", 2]);
    });

    it("accepts other slots repeated, like two activities", () => {
      const request = withConstraints({
        slots: ["activity", "dinner", "activity"],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("accepts a shopping slot, for thrift and market dates", () => {
      const request = withConstraints({ slots: ["shopping", "dinner"] });
      expect(CreatePlanRequest.safeParse(request).success).toBe(true);
    });

    it("rejects a shopping slot when every shop category is excluded", () => {
      const request = withConstraints({
        slots: ["shopping"],
        excludedCategories: ["second_hand", "market", "bookshop"],
      });
      expect(CreatePlanRequest.safeParse(request).success).toBe(false);
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
