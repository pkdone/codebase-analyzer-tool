import { MongoServerError } from "mongodb";
import { logErrorMsg } from "../utils/logging";

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
function isMongoServerErrorWithResponse(error: unknown): error is MongoServerErrorWithResponse {
  return (
    error instanceof MongoServerError &&
    typeof (error as MongoServerErrorWithResponse).errorResponse.errmsg === "string"
  );
}

/**
 * Logs a warning if the error is a MongoServerError for document validation failure.
 *
 * @param error The error to check and log if it is a MongoServerError with validation failure.
 */
export function logMongoValidationErrorIfPresent(error: unknown, doLog = true): void {
  if (doLog && isMongoServerErrorWithResponse(error)) {
    if (error.errorResponse.errmsg.toLowerCase().includes("document failed validation")) {
      logErrorMsg(
        `MongoDB document validation failed: ${JSON.stringify(error.errorResponse.errInfo)}`,
      );
    }
  }
}
