/**
 * Security error classes — deliberately zero imports. Anything that needs
 * to check `instanceof AuthenticationError` (like secureError.ts) shouldn't
 * be forced to pull in the Supabase import chain just to reference the
 * error type. authProvider.ts and authorize.ts both re-export from here.
 */

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
