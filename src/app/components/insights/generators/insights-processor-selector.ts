import { inject, injectable } from "tsyringe";
import { coreTokens } from "../../../di/tokens";
import { insightsTokens } from "../../../di/tokens";
import { llmTokens } from "../../../di/tokens";
import LLMRouter from "../../../../common/llm/llm-router";
import type { EnvVars } from "../../../env/env.types";
import type InsightsFromDBGenerator from "./db-insights-generator";
import type InsightsFromRawCodeGenerator from "./raw-code-insights-generator";
import { formatSourceFilesAsMarkdown } from "../../../utils/codebase-formatting";
import { fileProcessingRules as fileProcessingConfig } from "../../../domain/file-types";
import { llmProviderConfig } from "../../../../common/llm/config/llm.config";

/**
 * Service to determine which insights processor to use based on LLM capabilities.
 * The decision is based on whether the estimated tokens for the codebase are within the model's token limit.
 */
@injectable()
export class InsightsProcessorSelector {
  constructor(
    @inject(coreTokens.EnvVars) private readonly envVars: EnvVars,
    @inject(insightsTokens.InsightsFromDBGenerator)
    private readonly dbGenerator: InsightsFromDBGenerator,
    @inject(insightsTokens.InsightsFromRawCodeGenerator)
    private readonly rawCodeGenerator: InsightsFromRawCodeGenerator,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Selects the appropriate insights processor based on the LLM's token capacity.
   * Uses raw code processor if the estimated tokens for the codebase are within the model's limit.
   */
  async selectInsightsProcessor(): Promise<InsightsFromDBGenerator | InsightsFromRawCodeGenerator> {
    const manifest = this.llmRouter.getLLMManifest();
    const primaryCompletionTokens = manifest.models.primaryCompletion.maxTotalTokens;
    const codeBlocksContent = await formatSourceFilesAsMarkdown(
      this.envVars.CODEBASE_DIR_PATH,
      fileProcessingConfig.FOLDER_IGNORE_LIST,
      fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      fileProcessingConfig.FILENAME_IGNORE_LIST,
    );
    const codeBlockContentTokensEstimate =
      codeBlocksContent.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
    console.log(
      `Codebase chars length: ${codeBlocksContent.length}, Estimated prompt tokens: ${Math.floor(codeBlockContentTokensEstimate)}`,
    );
    const supportsFullCodebaseAnalysis = codeBlockContentTokensEstimate < primaryCompletionTokens;

    if (supportsFullCodebaseAnalysis) {
      return this.rawCodeGenerator;
    } else {
      return this.dbGenerator;
    }
  }
}
