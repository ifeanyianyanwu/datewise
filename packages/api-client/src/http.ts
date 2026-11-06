import {
  AlternativesResponse,
  ApiError,
  AuthResponse,
  CheckoutResponse,
  CreditsResponse,
  IdeasResponse,
  ListPlansResponse,
  NearbyVenuesResponse,
  Plan,
  User,
  VenueAvailability,
} from "@datewise/shared";
import type { z } from "zod";
import type { ApiClient, TokenStore } from "./client";
import { ApiClientError } from "./errors";

export type HttpClientOptions = {
  // e.g. "http://localhost:3000". No trailing slash.
  baseUrl: string;
  tokens: TokenStore;
  // Injected so tests can pass a fake. Defaults to the global fetch.
  fetch?: typeof fetch;
};

type Query = Record<string, string | number | undefined>;

type RequestOptions = {
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
};

// Path segments come from data (ids), so they're encoded: an id like "a/b" must not
// turn into two segments.
const segment = (value: string | number) => encodeURIComponent(String(value));

const internal = (message: string) => ({ code: "INTERNAL", message }) as const;

export const createHttpClient = (options: HttpClientOptions): ApiClient => {
  const { baseUrl, tokens } = options;
  // Read the global at call time, not import time, so tests and polyfills can replace it.
  const fetchFn = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const url = (path: string, query?: Query) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const search = params.size > 0 ? `?${params}` : "";
    return `${baseUrl}${path}${search}`;
  };

  const send = async (method: string, path: string, { body, query, headers }: RequestOptions) => {
    const requestHeaders = new Headers(headers);
    const current = await tokens.get();
    if (current) requestHeaders.set("authorization", `Bearer ${current.accessToken}`);
    if (body !== undefined) requestHeaders.set("content-type", "application/json");

    try {
      return await fetchFn(url(path, query), {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      // fetch only rejects when there's no response at all: offline, DNS, CORS.
      throw new ApiClientError(null, internal("Couldn't reach the server"), { cause });
    }
  };

  const readJson = async (response: Response): Promise<unknown> => {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  };

  // Throws for any non-2xx response, with the server's envelope when it sent one.
  const ensureOk = async (response: Response) => {
    if (response.ok) return;
    const parsed = ApiError.safeParse(await readJson(response));
    throw new ApiClientError(
      response.status,
      parsed.success ? parsed.data : internal(`The server answered ${response.status}`),
    );
  };

  // A request whose response body is checked against the contract.
  const request = async <T>(method: string, path: string, schema: z.ZodType<T>, opts: RequestOptions = {}) => {
    const response = await send(method, path, opts);
    await ensureOk(response);
    const parsed = schema.safeParse(await readJson(response));
    if (!parsed.success) {
      throw new ApiClientError(response.status, internal("The server's response didn't match the contract"), {
        cause: parsed.error,
      });
    }
    return parsed.data;
  };

  // A request whose response has no body (204).
  const requestEmpty = async (method: string, path: string, opts: RequestOptions = {}) => {
    await ensureOk(await send(method, path, opts));
  };

  const authenticate = async (path: string, body: unknown) => {
    const response = await request("POST", path, AuthResponse, { body });
    await tokens.set(response.tokens);
    return response;
  };

  return {
    auth: {
      signup: (body) => authenticate("/auth/signup", body),
      login: (body) => authenticate("/auth/login", body),
      logout: async () => {
        const current = await tokens.get();
        try {
          if (current) await requestEmpty("POST", "/auth/logout", { body: { refreshToken: current.refreshToken } });
        } finally {
          // Forget the tokens even if the server call failed: the user asked to log out.
          await tokens.set(null);
        }
      },
    },
    me: {
      get: () => request("GET", "/me", User),
      update: (body) => request("PATCH", "/me", User, { body }),
    },
    venues: {
      nearby: (query) => request("GET", "/venues/nearby", NearbyVenuesResponse, { query }),
      availability: (venueId, query) =>
        request("GET", `/venues/${segment(venueId)}/availability`, VenueAvailability, { query }),
    },
    ideas: {
      nearby: (query) => request("GET", "/ideas", IdeasResponse, { query }),
    },
    plans: {
      create: (body, { idempotencyKey }) =>
        request("POST", "/plans", Plan, { body, headers: { "idempotency-key": idempotencyKey } }),
      list: ({ cursor } = {}) => request("GET", "/plans", ListPlansResponse, { query: { cursor } }),
      get: (id) => request("GET", `/plans/${segment(id)}`, Plan),
      update: (id, body) => request("PATCH", `/plans/${segment(id)}`, Plan, { body }),
      remove: (id) => requestEmpty("DELETE", `/plans/${segment(id)}`),
      alternatives: (id, index) =>
        request("GET", `/plans/${segment(id)}/stops/${segment(index)}/alternatives`, AlternativesResponse),
      reroll: (id, { idempotencyKey }) =>
        request("POST", `/plans/${segment(id)}/reroll`, Plan, { headers: { "idempotency-key": idempotencyKey } }),
      cancel: (id) => request("POST", `/plans/${segment(id)}/cancel`, Plan),
    },
    credits: {
      get: () => request("GET", "/credits", CreditsResponse),
      checkout: (body) => request("POST", "/credits/checkout", CheckoutResponse, { body }),
    },
    events: {
      // Sockets arrive in week 4. Until then the HTTP client emits nothing; screens
      // fall back to polling GET /plans/:id.
      on: () => () => {},
    },
  };
};
