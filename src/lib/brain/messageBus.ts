/**
 * Smarkin OS — Message Bus
 *
 * Two channels:
 *  - Commands: directed, single-handler. dispatch("ExecuteCapability", ...)
 *    routes to exactly one registered handler.
 *  - Events: broadcast, multi-listener. publish("capability.started", ...)
 *    notifies every registered listener; none exist beyond the default
 *    logger in Phase 1.
 *
 * Honest scope note: with exactly one command and one handler today,
 * dispatching it and calling the handler directly are behaviorally
 * identical. The command channel exists so a second command later (e.g. a
 * future "RefreshBusinessIntelligence" trigger) has somewhere to go without
 * Brain changes — not because Phase 1 needs to route between commands.
 */
import { MessageBus } from "./smarkinService";
import { traceStore } from "./diagnostics/traceStore";

type CommandHandler = (payload: unknown) => Promise<unknown>;
type EventListener = (payload: unknown) => void;

const commandHandlers = new Map<string, CommandHandler>();
const eventListeners = new Map<string, EventListener[]>();

export function registerCommandHandler(command: string, handler: CommandHandler): void {
  if (commandHandlers.has(command)) {
    throw new Error(`Command "${command}" already has a registered handler — commands are single-handler by design.`);
  }
  commandHandlers.set(command, handler);
}

export function subscribeToEvent(event: string, listener: EventListener): void {
  const existing = eventListeners.get(event) ?? [];
  eventListeners.set(event, [...existing, listener]);
}

async function dispatch<T = unknown>(command: string, payload: unknown): Promise<T> {
  const handler = commandHandlers.get(command);
  if (!handler) {
    throw new Error(`No handler registered for command "${command}".`);
  }
  const dispatchTime = Date.now();
  try {
    const result = await handler(payload) as T;
    recordCommandDiagnostic(command, payload, dispatchTime, Date.now(), true);
    return result;
  } catch (err) {
    recordCommandDiagnostic(command, payload, dispatchTime, Date.now(), false);
    throw err;
  }
}

function recordCommandDiagnostic(command: string, payload: unknown, dispatchTime: number, completionTime: number, success: boolean): void {
  try {
    const executionId = (payload as { executionId?: string })?.executionId;
    if (executionId) {
      traceStore.recordCommand(executionId, { command, dispatchTime, completionTime, duration: completionTime - dispatchTime, success });
    }
  } catch (diagnosticError) {
    console.error("[MessageBus] Command diagnostic recording failed (dispatch unaffected):", diagnosticError);
  }
}

function publish(event: string, payload: unknown): void {
  const listeners = eventListeners.get(event) ?? [];
  try {
    const executionId = (payload as { executionId?: string })?.executionId;
    if (executionId) {
      traceStore.recordEvent(executionId, { event, timestamp: Date.now(), subscriberCount: listeners.length });
    }
  } catch (diagnosticError) {
    console.error("[MessageBus] Event diagnostic recording failed (publish unaffected):", diagnosticError);
  }
  for (const listener of listeners) {
    // A listener failure must never break the service call it's observing —
    // this is the one real risk named during planning, and it's a hard rule,
    // not a best-effort one.
    try {
      listener(payload);
    } catch (err) {
      console.error(`[MessageBus] Listener for event "${event}" threw:`, err);
    }
  }
}

export const messageBus: MessageBus = { dispatch, publish };

// The one listener that exists in Phase 1 — basic lifecycle logging,
// correlated by executionId so it's genuinely traceable despite the
// dispatch indirection.
subscribeToEvent("capability.started", (payload) => {
  const p = payload as { executionId: string; capability: string };
  console.log(`[Brain] ${p.executionId} — capability "${p.capability}" started`);
});
subscribeToEvent("capability.completed", (payload) => {
  const p = payload as { executionId: string; capability: string };
  console.log(`[Brain] ${p.executionId} — capability "${p.capability}" completed`);
});
subscribeToEvent("cache.hit", (payload) => {
  const p = payload as { executionId: string; productName: string };
  console.log(`[Brain] ${p.executionId} — Business Intelligence cache HIT for "${p.productName}"`);
});
subscribeToEvent("cache.miss", (payload) => {
  const p = payload as { executionId: string; productName: string };
  console.log(`[Brain] ${p.executionId} — Business Intelligence cache MISS for "${p.productName}", rebuilding`);
});
