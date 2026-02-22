import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm-request.types";
import { isLLMOk } from "../../../../common/llm/types/llm-result.types";
import { buildInsightPrompt } from "../../../prompts/prompt-builders";
import { appSummaryConfigMap } from "../../../prompts/app-summaries/app-summaries.definitions";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { logWarn } from "../../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../../common/utils/text-utils";
import { AppSummaryCategoryType, type AppSummaryCategorySchemas } from "../insights.types";
import { getLlmArtifactCorrections } from "../../../llm";
import { llmTokens } from "../../../di/tokens";

/**
 * Options for executing insight completion.
 */
export interface InsightCompletionOptions {
  /** Whether this is a partial analysis in map-reduce workflows */
  forPartialAnalysis?: boolean;
  /** Custom category label for the completion task (defaults to category) */
  taskCategory?: string;
}

/**
 * Injectable service that executes LLM completion for insight generation with standardized
 * error handling. Centralizes the common pattern of creating a prompt and calling the LLM router.
 *
 * The execute method is generic over the category type, enabling TypeScript to infer the correct
 * return type from the category's schema. This eliminates the need for unsafe type casts
 * by using the strongly-typed `appSummaryCategorySchemas` mapping.
 */
@injectable()
export class InsightsCompletionExecutor {
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Execute LLM completion for insight generation.
   *
   * @template C - The specific category type (inferred from the category parameter)
   * @param category The app summary category
   * @param sourceFileSummaries Array of source file summaries to analyze
   * @param options Configuration for the completion (optional)
   * @returns The generated insights with category-specific typing, or null if generation failed
   */
  async execute<C extends AppSummaryCategoryType>(
    category: C,
    sourceFileSummaries: readonly string[],
    options?: InsightCompletionOptions,
  ): Promise<z.infer<AppSummaryCategorySchemas[C]> | null> {
    const categoryLabel = getCategoryLabel(category);

    try {
      const taskCategory: string = options?.taskCategory ?? category;
      const codeContent = joinArrayWithSeparators(sourceFileSummaries);
      const { prompt, schema, metadata } = buildInsightPrompt(
        appSummaryConfigMap,
        category,
        codeContent,
        {
          forPartialAnalysis: options?.forPartialAnalysis,
        },
      );
      const result = await this.llmRouter.executeCompletion(taskCategory, prompt, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: metadata.hasComplexSchema,
        sanitizerConfig: getLlmArtifactCorrections(),
      });

      if (!isLLMOk(result)) {
        logWarn(`LLM completion failed for ${categoryLabel}: ${result.error.message}`);
        return null;
      }

      /**
       * TYPE ASSERTION RATIONALE:
       * TypeScript cannot automatically correlate that the schema returned by `buildInsightPrompt(category)`
       * (derived from `appSummaryConfigMap`) is identical to the schema defined in `AppSummaryCategorySchemas[C]`.
       *
       * Although they reference the same Zod schema objects at runtime, the compiler treats the
       * lookup `appSummaryConfigMap[C]["responseSchema"]` as a union of ALL possible schemas,
       * whereas the return type expects the SPECIFIC schema for category C.
       *
       * This cast is type-safe because:
       * 1. `category` determines both the prompt configuration and the expected return type.
       * 2. `llmRouter.executeCompletion` validates the response against the schema provided.
       * 3. We are effectively narrowing the inferred union type to the specific type required.
       */
      return result.value as z.infer<AppSummaryCategorySchemas[C]>;
    } catch (error: unknown) {
      logWarn(`${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`);
      return null;
    }
  }
}
