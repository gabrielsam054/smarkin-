/**
 * Every error thrown inside a Brain execution gets wrapped in this, once,
 * at the point it's caught by the trace recorder. `cause` is the native
 * ES2022 Error property — the original exception is preserved exactly,
 * inspectable via err.cause, never stringified away or discarded.
 */
export class SmarkinError extends Error {
  readonly executionId: string;
  readonly service: string;
  readonly capability: string;
  readonly timestamp: string;
  readonly pipelinePosition: number;

  constructor(
    message: string,
    context: { executionId: string; service: string; capability: string; pipelinePosition: number },
    originalError: unknown,
  ) {
    super(message, { cause: originalError });
    this.name = "SmarkinError";
    this.executionId = context.executionId;
    this.service = context.service;
    this.capability = context.capability;
    this.timestamp = new Date().toISOString();
    this.pipelinePosition = context.pipelinePosition;
  }
}
