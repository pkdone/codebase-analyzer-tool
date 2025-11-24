import { inject, injectable } from "tsyringe";
import { coreTokens } from "../../di/tokens";
import { insightsTokens } from "../../di/tokens";
import { llmTokens } from "../../di/tokens";
import LLMRouter from "../../llm/llm-router";
import type { EnvVars } from "../../env/env.types";
import type InsightsFromDBGenerator from "./processors/insights-from-db-generator";
import type InsightsFromRawCodeGenerator from "./processors/insights-from-raw-code-generator";
import { formatCodebaseForPrompt } from "./utils/codebase-formatter";
import { llmProviderConfig } from "../../llm/llm.config";

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
    const codeBlocksContent = await formatCodebaseForPrompt(this.envVars.CODEBASE_DIR_PATH);
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
