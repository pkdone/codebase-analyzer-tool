import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logErr } from "../../../common/utils/logging";
import type LLMRouter from "../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../common/llm/types/llm-request.types";
import { sourceSummarySchema } from "../../schemas/source-file.schema";
import type { CanonicalFileType } from "../../schemas/canonical-file-types";
import { getLlmArtifactCorrections } from "../../llm";
import { llmTokens, captureTokens } from "../../di/tokens";
import { type FileTypePromptRegistry } from "../../prompts/sources/sources.definitions";
import { buildSourcePrompt } from "../../prompts/prompt-builders";
import { type Result, ok, err, isOk } from "../../../common/types/result.types";

/**
 * Type for source summary (full schema).
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

/**
 * Type for partial source summary.
 * The prompt metadata uses picked subsets of sourceSummarySchema for validation,
 * so the LLM may not return all optional fields. This type accurately represents
 * the actual return type from the summarization process.
 */
export type PartialSourceSummaryType = Partial<SourceSummaryType>;

/**
 * Injectable service for generating file summaries using LLM.
 *
 * This service encapsulates the file summarization logic and receives its
 * dependencies via constructor injection, making it testable and following
 * the dependency inversion principle.
 */
@injectable()
export class FileSummarizerService {
  constructor(
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(captureTokens.FileTypePromptRegistry)
    private readonly fileTypePromptRegistry: FileTypePromptRegistry,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   * Returns a Result type that forces explicit error handling.
   *
   * Note: The prompt metadata uses picked subsets of sourceSummarySchema for validation.
   * The picked schemas include only the fields relevant to each file type. This function
   * returns a partial summary containing only the fields requested for that file type,
   * ensuring type safety aligns with runtime behavior.
   *
   * @param filepath The path to the file being summarized
   * @param canonicalFileType The canonical file type (e.g., "java", "javascript", "python")
   * @param content The file content to summarize
   * @returns A Result containing either the partial summary or an error
   */
  async summarize(
    filepath: string,
    canonicalFileType: CanonicalFileType,
    content: string,
  ): Promise<Result<PartialSourceSummaryType>> {
    try {
      if (content.trim().length === 0) return err(new Error("File is empty"));
      const { prompt, schema, metadata } = buildSourcePrompt(
        this.fileTypePromptRegistry,
        canonicalFileType,
        content,
      );
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: metadata.hasComplexSchema,
        sanitizerConfig: getLlmArtifactCorrections(),
      } as const;
      const result = await this.llmRouter.executeCompletion(filepath, prompt, completionOptions);

      if (!isOk(result)) {
        const errorMsg = `Failed to generate summary for '${filepath}'`;
        logErr(errorMsg, result.error);
        return err(result.error);
      }

      /**
       * TYPE ASSERTION RATIONALE:
       * The cast to `PartialSourceSummaryType` is necessary because TypeScript cannot
       * narrow the schema type through the dynamic runtime lookup `fileTypePromptRegistry[canonicalFileType]`.
       * When canonicalFileType is a runtime variable, TypeScript resolves the schema to the union
       * of all possible schemas across all file types.
       *
       * This assertion is TYPE-SAFE because:
       * 1. All schemas in fileTypePromptRegistry are created via `sourceSummarySchema.pick(...)`,
       *    making them strict subsets of SourceSummaryType.
       * 2. PartialSourceSummaryType is `Partial<SourceSummaryType>`, which is a supertype
       *    of all possible picked schemas.
       * 3. The LLM router validates the response against the specific schema at runtime,
       *    ensuring the data structure matches before reaching this cast.
       */
      return ok(result.value as PartialSourceSummaryType);
    } catch (error: unknown) {
      const errorMsg = `Failed to generate summary for '${filepath}'`;
      logErr(errorMsg, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
