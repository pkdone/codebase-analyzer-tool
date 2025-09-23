import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import type { EnvVars } from "../../env/env.types";
import type InsightsFromDBGenerator from "./insights-from-db-generator";
import type InsightsFromRawCodeGenerator from "./insights-from-raw-code-generator";

/**
 * Service to determine which insights processor to use based on LLM capabilities.
 * The decision is based on whether the primary completion model supports >= 1M tokens.
 */
@injectable()
export class InsightsProcessorSelector {
  constructor(
    @inject(TOKENS.EnvVars) private readonly envVars: EnvVars,
    @inject(TOKENS.InsightsFromDBGenerator) private readonly dbGenerator: InsightsFromDBGenerator,
    @inject(TOKENS.InsightsFromRawCodeGenerator)
    private readonly rawCodeGenerator: InsightsFromRawCodeGenerator,
  ) {}

  /**
   * Selects the appropriate insights processor based on the LLM's token capacity.
   * Uses raw code processor for models with >= 1M tokens, otherwise uses DB processor.
   */
  async selectInsightsProcessor(): Promise<InsightsFromDBGenerator | InsightsFromRawCodeGenerator> {
    const manifest = await LLMProviderManager.loadManifestForModelFamily(this.envVars.LLM);
    const primaryCompletionTokens = manifest.models.primaryCompletion.maxTotalTokens;
    const supportsFullCodebaseAnalysis = primaryCompletionTokens >= 1_000_000;
    // TODO: base decsision off token limit based on source line count and not the value of primaryCompletionTokens directly
    // For a line count of 720919, the number of input tokens is 13216743 but limit is 1000000

    if (supportsFullCodebaseAnalysis) {
      return this.rawCodeGenerator;
    } else {
      return this.dbGenerator;
    }
  }
}
