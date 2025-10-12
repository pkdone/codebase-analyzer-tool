import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import type { EnvVars } from "../../env/env.types";
import type InsightsFromDBGenerator from "./insights-from-db-generator";
import type InsightsFromRawCodeGenerator from "./insights-from-raw-code-generator";
import { formatCodebaseForPrompt } from "./utils/codebase-formatter";
import { llmProviderConfig } from "../../llm/llm.config";

/**
 * Service to determine which insights processor to use based on LLM capabilities.
 * The decision is based on whether the estimated tokens for the codebase are within the model's token limit.
 */
@injectable()
export class InsightsProcessorSelector {
  constructor(
    @inject(TOKENS.EnvVars) private readonly envVars: EnvVars,
    @inject(TOKENS.InsightsFromDBGenerator) private readonly dbGenerator: InsightsFromDBGenerator,
    @inject(TOKENS.InsightsFromRawCodeGenerator)
    private readonly rawCodeGenerator: InsightsFromRawCodeGenerator,
    @inject(TOKENS.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
  ) {}

  /**
   * Selects the appropriate insights processor based on the LLM's token capacity.
   * Uses raw code processor if the estimated tokens for the codebase are within the model's limit.
   */
  async selectInsightsProcessor(): Promise<InsightsFromDBGenerator | InsightsFromRawCodeGenerator> {
    const manifest = this.llmProviderManager.getLLMManifest();
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
