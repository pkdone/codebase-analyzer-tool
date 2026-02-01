import { writeFile } from "../../fs/file-operations";
import { ensureDirectoryExists } from "../../fs/directory-operations";
import { formatErrorMessageAndDetail } from "../../utils/error-formatters";
import { logWarn, logErr } from "../../utils/logging";
import { LLMErrorLoggingConfig } from "../config/llm-module-config.types";
import type { LLMContext } from "../types/llm-request.types";
import type { LLMResponsePayload } from "../types/llm-response.types";

/**
 * Service responsible for logging LLM JSON processing errors to files.
 */
export class LLMErrorLogger {
  private hasLoggedJsonError = false;

  constructor(private readonly config: LLMErrorLoggingConfig) {}

  /**
   * Records a JSON processing error to a file for debugging purposes.
   *
   * @param error - The error that occurred during JSON processing
   * @param responseContent - The LLM response content that failed to parse
   * @param context - The LLM context containing resource information
   */
  async recordJsonProcessingError(
    error: unknown,
    responseContent: LLMResponsePayload,
    context: LLMContext,
  ): Promise<void> {
    if (!responseContent || typeof responseContent !== "string") return;

    try {
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const filename = this.config.errorLogFilenameTemplate.replace("{timestamp}", timestamp);
      const errorDir = this.config.errorLogDirectory;
      const filepath = `${errorDir}/${filename}`;
      await ensureDirectoryExists(errorDir);
      const logContent =
        "Resource: " +
        context.resource +
        "\n\n" +
        "Error message:\n\n```\n" +
        formatErrorMessageAndDetail(
          "LLM response JSON processing error",
          error instanceof Error && error.cause ? error.cause : error,
        ) +
        "\n```\n\n\nBad LLM JSON response: \n\n```\n" +
        responseContent +
        "\n```";
      await writeFile(filepath, logContent);

      if (!this.hasLoggedJsonError) {
        logWarn(
          `First of potentially numerous errors detected trying to convert an LLM response to JSON - details written to: ${filepath}`,
        );
        this.hasLoggedJsonError = true;
      }
    } catch (fileError: unknown) {
      logErr("Failed to write error log file:", fileError);
    }
  }
}
