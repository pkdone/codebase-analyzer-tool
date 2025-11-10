import { DatabaseError } from "../errors/app-error";

/**
 * Error thrown when unable to connect to the database.
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message = "Failed to connect to the database", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when a database query fails.
 */
export class DatabaseQueryError extends DatabaseError {
  constructor(message = "Database query failed", cause?: Error) {
    super(message, cause);
  }
}
