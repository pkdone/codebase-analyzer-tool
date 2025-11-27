import { inspect } from "node:util";

/**
 * Type predicate to check if an object has a message property
 */
function hasMessageProperty(obj: unknown): obj is { message: unknown } {
  return typeof obj === "object" && obj !== null && Object.hasOwn(obj, "message");
}

/**
 * Formats an error for logging by serializing it to a string.
 * Handles Error instances, plain objects with message properties, and primitives.
 * Uses util.inspect for robust serialization that handles circular references.
 */
export function formatError(error: unknown): string {
  if (!error) return "<unknown-type>. No error message available";
  if (error instanceof Error) return `${error.constructor.name}. ${error.message}`;
  if (hasMessageProperty(error)) return `<unknown-type>. ${String(error.message)}`;
  // Use util.inspect for safe and detailed object serialization
  // depth: 2 limits recursion, breakLength: Infinity keeps output on single line
  return `<unknown-type>. ${inspect(error, { depth: 2, breakLength: Infinity })}`;
}

/**
 * Capture error message and detail as a formatted string.
 */
export function formatErrorMessageAndDetail(msg: string | null, error: unknown): string {
  const prefix = msg ? `${msg}:  ` : "";
  return `${prefix}'${formatError(error)}'\n${getErrorStack(error)}`;
}

/**
 * Get the stack trace from a thrown variable if it is an Error object otherwise indicate
 * that no stack trace is available.
 */
export function getErrorStack(obj: unknown): string {
  if (obj instanceof Error && obj.stack) return obj.stack;
  // For non-errors or errors without a stack, just return a descriptive message.
  return `No stack trace available for the provided non-Error object.`;
}
