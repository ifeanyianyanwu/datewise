import { describe, expect, it } from "vitest";
import { ApiError, ERROR_STATUS } from "../src";

describe("ApiError", () => {
  it("accepts VENUE_CLOSED with alternatives", () => {
    const error = {
      code: "VENUE_CLOSED",
      message: "Café Cordina is closed at 19:00",
      details: { venueId: "v1", alternatives: [] },
    };
    expect(ApiError.safeParse(error).success).toBe(true);
  });

  it("rejects VENUE_CLOSED without alternatives", () => {
    const error = { code: "VENUE_CLOSED", message: "Closed", details: { venueId: "v1" } };
    expect(ApiError.safeParse(error).success).toBe(false);
  });

  it("rejects an unknown code", () => {
    expect(ApiError.safeParse({ code: "TEAPOT", message: "I'm a teapot" }).success).toBe(false);
  });

  it("maps codes to HTTP statuses", () => {
    expect(ERROR_STATUS.OUT_OF_CREDITS).toBe(402);
    expect(ERROR_STATUS.VENUE_CLOSED).toBe(422);
    expect(ERROR_STATUS.VERSION_CONFLICT).toBe(409);
    expect(ERROR_STATUS.UNAUTHENTICATED).toBe(401);
    expect(ERROR_STATUS.FORBIDDEN).toBe(403);
  });
});
