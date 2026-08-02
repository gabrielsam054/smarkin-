/**
 * Smarkin Security — Secure Error Handling
 *
 * Users never receive stack traces, SQL errors, file paths, API keys,
 * service names, or database details. They receive a friendly message, the
 * executionId, and a category. The FULL SmarkinError (with cause chain)
 * still flows into Phase 1.5's TraceStore completely unchanged — this file
 * only shapes what crosses the boundary back to the caller.
 */
import { SmarkinError } from "../brain/diagnostics/errors";
import { AuthenticationError, AuthorizationError } from "./errors";

export type ErrorCategory = "authentication" | "authorization" | "validation" | "rate_limit" | "internal";

export interface SafeErrorResponse {
  message: string;
  executionId?: string;
  category: ErrorCategory;
}

const FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  authentication: "You must be signed in to do that.",
  authorization: "You don't have access to that resource.",
  validation: "Your request couldn't be processed — please check the information you entered.",
  rate_limit: "You're doing that too often — please wait a moment and try again.",
  internal: "Something went wrong. Please try again.",
};

export function toSafeErrorResponse(error: unknown, executionId?: string): SafeErrorResponse {
  let category: ErrorCategory = "internal";

  if (error instanceof AuthenticationError) category = "authentication";
  else if (error instanceof AuthorizationError) category = "authorization";
  else if (error instanceof SmarkinError) category = "internal"; // a real engine failure — still internal to the user, full detail is in the trace
  else if (error && typeof error === "object" && "name" in error && (error as Error).name === "ValidationError") category = "validation";

  return {
    message: FRIENDLY_MESSAGES[category],
    executionId,
    category,
  };
}
