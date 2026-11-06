import { z } from "zod";
import { Id } from "./common";
import { Plan, PlanFailure, PlanProgress } from "./plan";

// Socket events the server emits to the user's own room (week 4).
// Until then the mock client simulates them.
export const serverEvents = {
  "plan.progress": z.object({ planId: Id, progress: PlanProgress }),
  "plan.ready": z.object({ plan: Plan }),
  "plan.failed": z.object({ planId: Id, failure: PlanFailure }),
  "plan.cancelled": z.object({ planId: Id, refunded: z.boolean() }),
  "credits.updated": z.object({ balance: z.number().int().nonnegative() }),
} as const;

export type ServerEventName = keyof typeof serverEvents;
export type ServerEventPayload<E extends ServerEventName> = z.infer<(typeof serverEvents)[E]>;

// The shape Socket.IO's typed client and server expect.
export type ServerToClientEvents = {
  [E in ServerEventName]: (payload: ServerEventPayload<E>) => void;
};
