/**
 * Type predicate to check if an object has a message property
 */
function hasMessageProperty(obj: unknown): obj is { message: unknown } {
  return typeof obj === "object" && obj !== null && Object.hasOwn(obj, "message");
}

/**
 * Get the error text from a thrown variable which may or may not be an Error object.
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return "<unknown-type>. No error message available";  
  if (error instanceof Error) return `${error.constructor.name}. ${error.message}`;
  if (hasMessageProperty(error)) return `<unknown-type>. ${String(error.message)}`;

  try {
    return `<unknown-type>. ${JSON.stringify(error)}`;
  } catch {
    return `<unknown-type>. (Unserializable object)`;
  }
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
