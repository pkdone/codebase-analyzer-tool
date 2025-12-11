import { injectable } from "tsyringe";
import { writeFile } from "../../common/fs/file-operations";
import { ensureDirectoryExists } from "../../common/fs/directory-operations";
import { formatErrorMessageAndDetail } from "../../common/utils/error-formatters";
import { logOneLineWarning, logError } from "../../common/utils/logging";
import { loggingConfig } from "./logging.config";
import type { LLMContext, LLMGeneratedContent } from "../types/llm.types";

/**
 * Service responsible for logging LLM JSON processing errors to files.
 * Decouples error logging concerns from the core LLM provider abstraction.
 */
@injectable()
export class LLMErrorLogger {
  private hasLoggedJsonError = false;

  /**
   * Records a JSON processing error to a file for debugging purposes.
   *
   * @param error - The error that occurred during JSON processing
   * @param responseContent - The LLM response content that failed to parse
   * @param context - The LLM context containing resource information
   */
  async recordJsonProcessingError(
    error: unknown,
    responseContent: LLMGeneratedContent,
    context: LLMContext,
  ): Promise<void> {
    if (typeof responseContent !== "string") return;

    try {
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const filename = loggingConfig.ERROR_LOG_FILENAME_TEMPLATE.replace("{timestamp}", timestamp);
      const errorDir = loggingConfig.ERROR_LOG_DIRECTORY;
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
        logOneLineWarning(
          `First of potentially numerous errors detected trying to convert an LLM response to JSON - details written to: ${filepath}`,
        );
        this.hasLoggedJsonError = true;
      }
    } catch (fileError: unknown) {
      logError("Failed to write error log file:", fileError);
    }
  }
}
