/**
 * Base class for all application errors.
 * Provides a consistent error handling strategy across the application.
 */
export abstract class AppError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

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

/**
 * Error thrown when a database query fails.
 */
export class DatabaseQueryError extends DatabaseError {
  constructor(message = "Database query failed", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 */
export class ConfigurationError extends AppError {
  constructor(message = "Configuration error", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when file system operations fail.
 */
export class FileSystemError extends AppError {
  constructor(message = "File system error", cause?: Error) {
    super(message, cause);
  }
}
