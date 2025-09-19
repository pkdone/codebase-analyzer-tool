import { formatErrorMessage, getErrorStack } from "./error-formatters";

/**
 * Log an error message and the error stack to the console.
 */
export function logErrorMsgAndDetail(msg: string | null, error: unknown): void {
  const prefix = msg ? `${msg}: ` : "";
  console.error(`${prefix}${formatErrorMessage(error)}\n-\n${getErrorStack(error)}`);
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
