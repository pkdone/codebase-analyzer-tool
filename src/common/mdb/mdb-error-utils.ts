import { MongoServerError } from "mongodb";
import { logErrorMsg } from "../utils/error-utils";

/**
 * Logs a warning if the error is a MongoServerError for document validation failure.
 *
 * @param error The error to check and log if it is a MongoServerError with validation failure.
 */
export function logMongoValidationErrorIfPresent(error: unknown, doLog = true): void {
  if (
    doLog &&
    error instanceof MongoServerError &&
    typeof error.errorResponse.errmsg === "string" &&
    error.errorResponse.errmsg.toLowerCase().includes("document failed validation")
  ) {
    logErrorMsg(
      `MongoDB document validation failed: ${JSON.stringify(error.errorResponse.errInfo)}`,
    );
  }
}
