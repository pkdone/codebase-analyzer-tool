import { Double } from "bson";
import { logErrorMsg, logErrorMsgAndDetail } from "../utils/error-utils";
import { MongoServerError } from "mongodb";

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
export const REDACTED_URL = "REDACTED_URL";
export const REDACTED_CREDENTIALS = "REDACTED";

/**
 * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
 *
 * @param numbers The array of numbers to convert.
 * @returns The array of BSON Doubles.
 */
export function convertArrayOfNumbersToArrayOfDoubles(numbers: number[]): Double[] {
  return numbers.map((number) => new Double(number));
}

/**
 * Redacts sensitive credentials from a MongoDB connection string.
 *
 * @param url The MongoDB connection string.
 * @returns A redacted connection string.
 */
export function redactUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.username || parsedUrl.password) {
      parsedUrl.username = REDACTED_CREDENTIALS;
      parsedUrl.password = REDACTED_CREDENTIALS;
    }
    return parsedUrl.toString();
  } catch (error: unknown) {
    logErrorMsgAndDetail("Could not parse URL for redaction", error);
    return REDACTED_URL;
  }
}

/**
 * Creates a vector search index definition for MongoDB Atlas Vector Search.
 *
 * @param indexName The name of the index
 * @param vectorPath The path to the vector field to index
 * @param dimensions The number of dimensions for the vector
 * @param similarity The similarity metric to use
 * @param quantization The quantization type
 * @param filters Optional array of filter field definitions
 * @returns The vector search index definition
 */
export function createVectorSearchIndexDefinition(
  indexName: string,
  vectorPath: string,
  dimensions = 1536,
  similarity = "euclidean",
  quantization = "scalar",
  filters: { type: string; path: string }[] = [],
) {
  return {
    name: indexName,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: vectorPath,
          numDimensions: dimensions,
          similarity: similarity,
          quantization: quantization,
        },
        ...filters.map((filter) => ({
          type: filter.type,
          path: filter.path,
        })),
      ],
    },
  };
}
