import { container } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import type { EnvVars } from "../../lifecycle/env.types";
import type { InsightsGenerator } from "./insights-generator.interface";
import InsightsFromDBGenerator from "./insights-from-db-generator";
import InsightsFromRawCodeGenerator from "./insights-from-raw-code-generator";
import { LLMService } from "../../llm/core/llm-service";

/**
 * Factory function that creates the appropriate InsightsGenerator implementation
 * based on the LLM provider's capability for full codebase analysis.
 */
export async function createInsightsGenerator(): Promise<InsightsGenerator> {
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);

  // Load the manifest for the current LLM to check its capabilities
  const manifest = await LLMService.loadManifestForModelFamily(envVars.LLM);

  if (manifest.supportsFullCodebaseAnalysis) {
    return container.resolve(InsightsFromRawCodeGenerator);
  } else {
    return container.resolve(InsightsFromDBGenerator);
  }
}
