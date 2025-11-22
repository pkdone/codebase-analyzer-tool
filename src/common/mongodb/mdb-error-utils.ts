import { MongoServerError } from "mongodb";
import { logSingleLineWarning } from "../utils/logging";

/**
 * Type guard and interface for MongoDB server error with response details
 */
interface MongoServerErrorWithResponse extends MongoServerError {
  errorResponse: {
    errmsg: string;
    errInfo?: Record<string, unknown>;
  };
}

/**
 * Type guard to check if error is a MongoServerError with error response
 */
export function isMongoServerErrorWithResponse(
  error: unknown,
): error is MongoServerErrorWithResponse {
  if (!(error instanceof MongoServerError)) return false;
  // Access errorResponse only after verifying it's present and well-formed
  const errorResponse = (error as { errorResponse?: unknown }).errorResponse;
  if (typeof errorResponse !== "object" || errorResponse === null) return false;
  const errmsg = (errorResponse as { errmsg?: unknown }).errmsg;
  return typeof errmsg === "string";
}

/**
 * Logs a warning if the error is a MongoServerError for document validation failure.
 *
 * @param error The error to check and log if it is a MongoServerError with validation failure.
 */
export function logMongoValidationErrorIfPresent(error: unknown, doLog = true): void {
  if (doLog && isMongoServerErrorWithResponse(error)) {
    if (error.errorResponse.errmsg.toLowerCase().includes("document failed validation")) {
      logSingleLineWarning("MongoDB document validation failed", error.errorResponse.errInfo);
    }
  }
}
