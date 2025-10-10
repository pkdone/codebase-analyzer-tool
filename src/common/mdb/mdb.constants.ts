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
 * MongoDB error code for NamespaceExists (collection already exists).
 * @see https://www.mongodb.com/docs/manual/reference/error-codes/
 */
export const MONGODB_NAMESPACE_EXISTS_ERROR_CODE = 48;
