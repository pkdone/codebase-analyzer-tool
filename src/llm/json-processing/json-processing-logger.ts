import { logWarningMsg, logErrorMsg } from "../../common/utils/logging";

/**
 * Centralized logger for JSON processing operations.
 * Provides consistent logging interface for sanitization steps, validation issues,
 * and processing errors across the JSON processing pipeline.
 *
 * @example
 * ```typescript
 * const logger = new JsonProcessingLogger("UserProfile");
 * logger.logSanitizationStep("Removed code fences");
 * logger.logSanitizationSummary(["Removed code fences", "Fixed commas"]);
 * ```
 */
export class JsonProcessingLogger {
  /**
   * Creates a logger for a specific resource being processed.
   *
   * @param resourceName - The name of the resource being processed (e.g., "AppSummary", "FileMetadata")
   */
  constructor(private readonly resourceName: string) {}

  /**
   * Gets the resource name for this logger.
   */
  get resource(): string {
    return this.resourceName;
  }

  /**
   * Logs a single sanitization step. Used during the sanitization pipeline
   * to record individual transformations applied to the content.
   *
   * @param step - Description of the sanitization step applied
   */
  logSanitizationStep(step: string): void {
    logWarningMsg(`[${this.resourceName}] JSON sanitization step: ${step}`);
  }

  /**
   * Logs a summary of all sanitization steps applied. Called at the end of
   * successful sanitization to provide an overview of transformations.
   *
   * @param steps - Array of step descriptions that were applied
   */
  logSanitizationSummary(steps: readonly string[]): void {
    if (steps.length > 0) {
      logWarningMsg(
        `[${this.resourceName}] Applied ${steps.length} sanitization steps: ${steps.join(" -> ")}`,
      );
    }
  }

  /**
   * Logs validation issues encountered during schema validation.
   *
   * @param issues - Description of validation issues or a structured error object
   */
  logValidationIssues(issues: string): void {
    logErrorMsg(
      `[${this.resourceName}] Schema validation failed. Validation issues: ${issues}`,
    );
  }

  /**
   * Logs validation issues for TEXT format content.
   */
  logTextFormatValidationError(): void {
    logErrorMsg(
      `[${this.resourceName}] Content for TEXT format is not valid LLMGeneratedContent`,
    );
  }

  /**
   * Logs validation issues for untyped content.
   */
  logContentValidationError(): void {
    logErrorMsg(`[${this.resourceName}] Content is not valid LLMGeneratedContent`);
  }
}

