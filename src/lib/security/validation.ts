/**
 * Smarkin Security — Input Validation
 *
 * Deviation from the approved plan, disclosed explicitly: the plan
 * recommended zod. This sandbox has no node_modules at all — not zod, not
 * any of this project's existing dependencies — so nothing importing an
 * external package can be run end-to-end here, only type-checked. Rather
 * than write zod-based code I cannot verify and call it done, this is a
 * small, dependency-free validator I CAN actually test, matching the same
 * "don't claim untested things are verified" discipline used for the
 * Business Intelligence Cache in Phase 1. validate() and ValidationResult
 * are written so a future zod-backed implementation is a drop-in
 * replacement — no caller of validateBrainRequest() needs to change.
 */

import { isCapabilityRegistered } from "../brain/pipelineBuilder";

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };

const MAX_STRING_LENGTH = 500;
const MAX_PAYLOAD_BYTES = 50_000; // generous for a form payload, well below anything pathological

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidLength(v: string, max: number): boolean {
  return v.length <= max;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_PATTERN.test(v);
}

const URL_PATTERN = /^https?:\/\/.+/i;
export function isValidURL(v: unknown): v is string {
  return typeof v === "string" && URL_PATTERN.test(v);
}

export function isValidEnum<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v);
}

interface RawBrainRequest {
  capability?: unknown;
  userId?: unknown;
  productName?: unknown;
  description?: unknown;
  businessType?: unknown;
  payload?: unknown;
}

/**
 * Validates the shape every BrainRequest must follow, BEFORE it reaches the
 * Brain — this is deliberately independent of whether the request is
 * authenticated (that's Section 4's job) or authorized (Section 5's). A
 * malformed request is rejected regardless of who sent it.
 */
export function validateBrainRequest(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (raw === null || typeof raw !== "object") {
    return { valid: false, errors: [{ field: "root", message: "Request body must be an object." }] };
  }

  const payloadSize = JSON.stringify(raw).length;
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return { valid: false, errors: [{ field: "root", message: `Payload exceeds maximum size of ${MAX_PAYLOAD_BYTES} bytes.` }] };
  }

  const request = raw as RawBrainRequest;

  // capability is optional on the wire (defaults to "advertising" downstream),
  // but if present, it must be a genuinely registered capability — checked
  // against the actual Pipeline Builder registration, not a separately-
  // maintained list here that could drift out of sync with it. Registering
  // a new capability (registerPipeline() in that capability's own file)
  // automatically makes it valid here too — zero edits to this file.
  if (request.capability !== undefined) {
    if (typeof request.capability !== "string" || !isCapabilityRegistered(request.capability)) {
      errors.push({ field: "capability", message: "If provided, capability must be a registered capability." });
    }
  }

  // userId is intentionally NOT validated for correctness here — Section 4
  // (Authentication) overwrites it with the resolved session identity
  // regardless of what's on the wire, so validating a value that will be
  // discarded would be pointless. It's still checked for TYPE, since a
  // non-string would break downstream code before authentication even runs.
  if (request.userId !== undefined && typeof request.userId !== "string") {
    errors.push({ field: "userId", message: "userId, if present, must be a string (its value is not trusted regardless)." });
  }

  if (!isNonEmptyString(request.productName)) {
    errors.push({ field: "productName", message: "productName is required and must be a non-empty string." });
  } else if (!isValidLength(request.productName, MAX_STRING_LENGTH)) {
    errors.push({ field: "productName", message: `productName must be ${MAX_STRING_LENGTH} characters or fewer.` });
  }

  if (request.description !== undefined) {
    if (typeof request.description !== "string") {
      errors.push({ field: "description", message: "description, if present, must be a string." });
    } else if (!isValidLength(request.description, MAX_STRING_LENGTH * 4)) {
      errors.push({ field: "description", message: `description must be ${MAX_STRING_LENGTH * 4} characters or fewer.` });
    }
  }

  if (request.payload === undefined || request.payload === null || typeof request.payload !== "object") {
    errors.push({ field: "payload", message: "payload is required and must be an object." });
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
