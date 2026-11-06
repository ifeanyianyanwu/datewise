import type { AuthTokens } from "@datewise/shared";
import { describe, expect, it } from "vitest";
import { ApiClientError, createHttpClient, memoryTokenStore } from "../src";
import { planRequest, queuedPlan, SLIEMA, tokens, user } from "./fixtures";

const BASE_URL = "http://api.test";

type Call = { url: string; method: string; headers: Headers; body: unknown };

// A fake fetch: replies with the queued responses in order and records every request.
const fakeFetch = (...responses: Array<Response | Error>) => {
  const calls: Call[] = [];
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    const next = responses.shift();
    if (!next) throw new Error("fakeFetch: no response queued");
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const setup = (responses: Array<Response | Error>, initialTokens: AuthTokens | null = tokens) => {
  const fake = fakeFetch(...responses);
  const store = memoryTokenStore(initialTokens);
  const client = createHttpClient({ baseUrl: BASE_URL, tokens: store, fetch: fake.fetch });
  return { client, store, calls: fake.calls };
};

// Awaits a promise that should reject and returns the ApiClientError it rejected with.
const caught = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiClientError);
  return error as ApiClientError;
};

describe("createHttpClient", () => {
  describe("requests", () => {
    it("posts JSON to the path and resolves with the parsed body", async () => {
      const { client, calls } = setup([json(200, { user, tokens })], null);

      const response = await client.auth.login({ email: user.email, password: "hunter22" });

      expect(response.user.id).toBe("u1");
      expect(calls[0]).toMatchObject({
        url: `${BASE_URL}/auth/login`,
        method: "POST",
        body: { email: user.email, password: "hunter22" },
      });
      expect(calls[0]?.headers.get("content-type")).toBe("application/json");
    });

    it("saves the tokens from login", async () => {
      const { client, store } = setup([json(200, { user, tokens })], null);
      await client.auth.login({ email: user.email, password: "hunter22" });
      expect(await store.get()).toEqual(tokens);
    });

    it("sends the access token as a bearer token", async () => {
      const { client, calls } = setup([json(200, user)]);
      await client.me.get();
      expect(calls[0]?.headers.get("authorization")).toBe("Bearer access-1");
    });

    it("sends no authorization header when logged out", async () => {
      const { client, calls } = setup([json(200, { user, tokens })], null);
      await client.auth.login({ email: user.email, password: "hunter22" });
      expect(calls[0]?.headers.has("authorization")).toBe(false);
    });

    it("builds the query string and leaves out fields that aren't set", async () => {
      const { client, calls } = setup([json(200, { venues: [] })]);
      await client.venues.nearby({ ...SLIEMA, radius: 1500, category: "cafe" });
      expect(calls[0]?.url).toBe(`${BASE_URL}/venues/nearby?lat=35.9122&lng=14.5042&radius=1500&category=cafe`);
    });

    it("encodes ids in the path", async () => {
      const { client, calls } = setup([json(200, queuedPlan)]);
      await client.plans.get("a/b?c");
      expect(calls[0]?.url).toBe(`${BASE_URL}/plans/a%2Fb%3Fc`);
    });

    it("sends the Idempotency-Key header when creating a plan", async () => {
      const { client, calls } = setup([json(202, queuedPlan)]);
      await client.plans.create(planRequest, { idempotencyKey: "key-1" });
      expect(calls[0]?.headers.get("idempotency-key")).toBe("key-1");
    });

    it("resolves with nothing on 204 No Content", async () => {
      const { client, calls } = setup([new Response(null, { status: 204 })]);
      await expect(client.plans.remove("p1")).resolves.toBeUndefined();
      expect(calls[0]?.method).toBe("DELETE");
    });

    it("logs out with the refresh token and clears the store", async () => {
      const { client, calls, store } = setup([new Response(null, { status: 204 })]);
      await client.auth.logout();
      expect(calls[0]).toMatchObject({ url: `${BASE_URL}/auth/logout`, body: { refreshToken: "refresh-1" } });
      expect(await store.get()).toBeNull();
    });
  });

  describe("errors", () => {
    it("rejects with the error envelope, narrowed by code", async () => {
      const envelope = {
        code: "VENUE_CLOSED",
        message: "Closed at that time",
        details: { venueId: "v1", alternatives: [] },
      };
      const { client } = setup([json(422, envelope)]);

      const error = await caught(client.plans.create(planRequest, { idempotencyKey: "key-1" }));

      expect(error.status).toBe(422);
      expect(error.body.code).toBe("VENUE_CLOSED");
      if (error.body.code === "VENUE_CLOSED") expect(error.body.details.venueId).toBe("v1");
    });

    it("turns a body that isn't an envelope, like a proxy's HTML page, into INTERNAL", async () => {
      const { client } = setup([new Response("<h1>Bad gateway</h1>", { status: 502 })]);
      const error = await caught(client.me.get());
      expect(error.status).toBe(502);
      expect(error.body.code).toBe("INTERNAL");
    });

    it("rejects a success response that breaks the contract", async () => {
      const { client } = setup([json(200, { ...user, creditBalance: -1 })]);
      const error = await caught(client.me.get());
      expect(error.status).toBe(200);
      expect(error.body.code).toBe("INTERNAL");
    });

    it("rejects with status null when the request never gets a response", async () => {
      const { client } = setup([new TypeError("fetch failed")]);
      const error = await caught(client.me.get());
      expect(error.status).toBeNull();
      expect(error.body.code).toBe("INTERNAL");
      expect(error.cause).toBeInstanceOf(TypeError);
    });
  });
});
