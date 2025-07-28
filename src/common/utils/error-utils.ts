/**
 * Log an error message and the error stack to the console.
 */
export function logErrorMsgAndDetail(msg: string | null, error: unknown): void {
  if (msg) {
    console.error(msg, getErrorText(error), "-", getErrorStack(error));
  } else {
    console.error(getErrorText(error), "-", getErrorStack(error));
  }
}

/**
 * Log an error and its stack to the console.
 */
export function logErrorDetail(error: unknown): void {
  logErrorMsgAndDetail(null, error);
}

/**
 * Log an string msg flagged as an error.
 */
export function logErrorMsg(errMsg: string): void {
  console.error(errMsg);
}

/**
 * Log an string msg flagged as an warning.
 */
export function logWarningMsg(wrnMsg: string): void {
  console.warn(wrnMsg);
}

/**
 * Type predicate to check if an object has a message property
 */
function hasMessageProperty(obj: unknown): obj is { message: unknown } {
  return typeof obj === "object" && obj !== null && Object.hasOwn(obj, "message");
}

/**
 * Get the error text from a thrown variable which may or may not be an Error object.
 */
export function getErrorText(error: unknown): string {
  const errType = error instanceof Error ? error.constructor.name : "<unknown-type>";

  if (!error) {
    return `${errType}. No error message available`;
  }
  
  if (error instanceof Error) {
    return `${errType}. ${error.message}`;
  }
  
  if (hasMessageProperty(error)) {
    return `${errType}. ${String(error.message)}`;
  }
  
  // Use safe stringification to prevent circular reference errors
  try {
    return `${errType}. ${JSON.stringify(error)}`;
  } catch {
    return `${errType}. (Unserializable object)`;
  }
}

/**
 * Get the stack trace from a thrown variable if it is an Error object otherwise indicate
 * that no stack trace is available.
 */
export function getErrorStack(obj: unknown): string {
  if (obj instanceof Error && obj.stack) {
    return obj.stack;
  }
  // For non-errors or errors without a stack, just return a descriptive message.
  return `No stack trace available for the provided non-Error object.`;
}
