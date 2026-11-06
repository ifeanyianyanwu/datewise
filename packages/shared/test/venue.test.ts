import { describe, expect, it } from "vitest";
import { NearbyVenuesQuery } from "../src";

// Query strings arrive as strings, e.g. ?lat=35.8989&lng=14.5146&radius=3000
const query = { lat: "35.8989", lng: "14.5146", radius: "3000" };

describe("NearbyVenuesQuery", () => {
  it("coerces query-string values to numbers", () => {
    expect(NearbyVenuesQuery.parse(query)).toEqual({ lat: 35.8989, lng: 14.5146, radius: 3000 });
  });

  it("rejects a latitude outside -90..90", () => {
    expect(NearbyVenuesQuery.safeParse({ ...query, lat: "135" }).success).toBe(false);
  });

  it("accepts a complete time window", () => {
    const window = { openFrom: "2026-11-14T19:00:00+01:00", openUntil: "2026-11-14T22:00:00+01:00" };
    expect(NearbyVenuesQuery.safeParse({ ...query, ...window }).success).toBe(true);
  });

  it("rejects half a time window", () => {
    expect(NearbyVenuesQuery.safeParse({ ...query, openFrom: "2026-11-14T19:00:00+01:00" }).success).toBe(false);
  });

  it("rejects a window that ends before it starts", () => {
    const window = { openFrom: "2026-11-14T22:00:00+01:00", openUntil: "2026-11-14T19:00:00+01:00" };
    expect(NearbyVenuesQuery.safeParse({ ...query, ...window }).success).toBe(false);
  });
});
