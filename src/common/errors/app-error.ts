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
