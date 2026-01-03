import { AppError } from "../errors/app-error";

/**
 * Base class for all database-related errors.
 */
export abstract class DatabaseError extends AppError {}

/**
 * Error thrown when unable to connect to the database.
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message = "Failed to connect to the database", cause?: Error) {
    super(message, cause);
  }
}
