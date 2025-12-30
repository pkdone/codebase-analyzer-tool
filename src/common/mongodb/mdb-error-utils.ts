import { MongoServerError } from "mongodb";
import { logOneLineWarning } from "../utils/logging";

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
 * Type guard to check if error is a MongoServerError with error response.
 * Checks that errorResponse exists and has a string errmsg property.
 */
export function isMongoServerErrorWithResponse(
  error: unknown,
): error is MongoServerErrorWithResponse {
  if (!(error instanceof MongoServerError)) return false;

  // MongoServerError has errorResponse typed as ErrorDescription which extends Document.
  // ErrorDescription has optional errmsg property - check it's a string.
  // The type system says errorResponse is always defined, but we access errmsg directly.
  const { errmsg } = error.errorResponse;
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
      logOneLineWarning("MongoDB document validation failed", error.errorResponse.errInfo);
    }
  }
}
