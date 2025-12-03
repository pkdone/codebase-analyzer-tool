/**
 * MongoDB-specific constants and error codes.
 * These are constants defined by the MongoDB driver and server.
 */

/**
 * MongoDB error codes for duplicate key errors (including duplicate indexes).
 * @see https://docs.mongodb.com/manual/reference/error-codes/#DuplicateKey
 */
export const MONGODB_DUPLICATE_OBJ_ERROR_CODES = [11000, 68] as const;

/**
 * Set version of MONGODB_DUPLICATE_OBJ_ERROR_CODES for efficient membership checking.
 * Use Set.has() for O(1) lookup instead of Array.includes() O(n).
 * Typed as Set<number> to allow checking any numeric error code.
 */
export const MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET = new Set<number>(
  MONGODB_DUPLICATE_OBJ_ERROR_CODES,
);

/**
 * MongoDB error code for NamespaceExists (collection already exists).
 * @see https://www.mongodb.com/docs/manual/reference/error-codes/
 */
export const MONGODB_NAMESPACE_EXISTS_ERROR_CODE = 48;
