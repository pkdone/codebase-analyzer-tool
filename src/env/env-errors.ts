import { AppError } from "../common/errors/app-error";

/**
 * Error thrown when configuration is invalid or missing.
 */
export class ConfigurationError extends AppError {
  constructor(message = "Configuration error", cause?: Error) {
    super(message, cause);
  }
}
