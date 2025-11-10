import { AppError } from "../errors/app-error";

/**
 * Error thrown when file system operations fail.
 */
export class FileSystemError extends AppError {
  constructor(message = "File system error", cause?: Error) {
    super(message, cause);
  }
}
