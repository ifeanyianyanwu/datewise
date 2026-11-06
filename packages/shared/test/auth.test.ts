import { describe, expect, it } from "vitest";
import { DEFAULT_CURRENCY, SignupRequest } from "../src";

const signup = () => ({
  email: "ada@example.com",
  password: "correct horse battery",
  name: "Ada",
  timezone: "Europe/Malta",
});

describe("SignupRequest", () => {
  it("accepts a signup without a currency (the server falls back to the default)", () => {
    expect(SignupRequest.safeParse(signup()).success).toBe(true);
    expect(DEFAULT_CURRENCY).toBe("EUR");
  });

  it("accepts a detected currency", () => {
    expect(SignupRequest.safeParse({ ...signup(), currency: "EUR" }).success).toBe(true);
  });

  it("rejects a password longer than 72 bytes, bcrypt's input limit", () => {
    expect(SignupRequest.safeParse({ ...signup(), password: "a".repeat(73) }).success).toBe(false);
  });

  it("counts bytes, not characters: 40 × 'é' is 80 bytes in UTF-8", () => {
    expect(SignupRequest.safeParse({ ...signup(), password: "é".repeat(40) }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(SignupRequest.safeParse({ ...signup(), email: "ada@" }).success).toBe(false);
  });
});
