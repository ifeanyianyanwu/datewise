import type {
  AlternativesResponse,
  AuthResponse,
  AuthTokens,
  CheckoutRequest,
  CheckoutResponse,
  CreatePlanRequest,
  CreditsResponse,
  IdeasQuery,
  IdeasResponse,
  ListPlansResponse,
  LoginRequest,
  NearbyVenuesQuery,
  NearbyVenuesResponse,
  Plan,
  ServerEventName,
  ServerEventPayload,
  SignupRequest,
  UpdateMeRequest,
  UpdatePlanRequest,
  User,
  VenueAvailability,
  VenueAvailabilityQuery,
} from "@datewise/shared";

// The key that makes a retried POST safe: the server answers a repeated key with the
// first result instead of charging again. Make one per user action (one tap of
// "Generate") and reuse it for every retry of that action.
export type IdempotencyOptions = { idempotencyKey: string };

// What every screen talks to. The mock and the HTTP client both implement it, so a
// screen never knows which one it has. Every method throws ApiClientError on failure.
export interface ApiClient {
  auth: {
    // Both save the returned tokens in the client's TokenStore.
    signup(body: SignupRequest): Promise<AuthResponse>;
    login(body: LoginRequest): Promise<AuthResponse>;
    // Revokes the refresh token and clears the TokenStore.
    logout(): Promise<void>;
  };
  me: {
    get(): Promise<User>;
    update(body: UpdateMeRequest): Promise<User>;
  };
  venues: {
    nearby(query: NearbyVenuesQuery): Promise<NearbyVenuesResponse>;
    availability(venueId: string, query: VenueAvailabilityQuery): Promise<VenueAvailability>;
  };
  ideas: {
    nearby(query: IdeasQuery): Promise<IdeasResponse>;
  };
  plans: {
    create(body: CreatePlanRequest, options: IdempotencyOptions): Promise<Plan>;
    list(options?: { cursor?: string }): Promise<ListPlansResponse>;
    get(id: string): Promise<Plan>;
    update(id: string, body: UpdatePlanRequest): Promise<Plan>;
    remove(id: string): Promise<void>;
    alternatives(id: string, index: number): Promise<AlternativesResponse>;
    // Resolves with the new revision.
    reroll(id: string, options: IdempotencyOptions): Promise<Plan>;
    // Resolves with the cancelled plan.
    cancel(id: string): Promise<Plan>;
  };
  credits: {
    get(): Promise<CreditsResponse>;
    checkout(body: CheckoutRequest): Promise<CheckoutResponse>;
  };
  events: {
    // Subscribe to a server event. Returns a function that unsubscribes, ready to be
    // returned from a useEffect.
    on<E extends ServerEventName>(name: E, handler: (payload: ServerEventPayload<E>) => void): () => void;
  };
}

// Where the client keeps tokens between requests. Async, because the mobile store
// (expo-secure-store) is; the web store is picked in Step 4a.
export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens | null): Promise<void>;
}

// Forgets everything on reload. Fine for tests and the mock.
export const memoryTokenStore = (initial: AuthTokens | null = null): TokenStore => {
  let tokens = initial;
  return {
    get: async () => tokens,
    set: async (next) => {
      tokens = next;
    },
  };
};
