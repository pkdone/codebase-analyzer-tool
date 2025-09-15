import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import { RawCodeToInsightsFileGenerator } from "../../components/insights/insights-from-raw-code-to-local-files";

// LLM imports needed for insights selection logic
import { EnvVars } from "../../env/env.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";

/**
 * Register insights-related components in the DI container.
 * 
 * This module handles the registration of components responsible for:
 * - Generating insights from database content
 * - Generating insights from raw code
 * - Managing insight generation strategies based on LLM capabilities
 */
export function registerInsightsComponents(): void {
  container.registerSingleton(
    TOKENS.RawCodeToInsightsFileGenerator,
    RawCodeToInsightsFileGenerator,
  );
  
  console.log("Insights components registered");
}

/**
 * Register insights components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export async function registerLLMDependentInsightsComponents(): Promise<void> {
  // Register both insights generator implementations with explicit tokens
  container.registerSingleton(TOKENS.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(TOKENS.InsightsFromRawCodeGenerator, InsightsFromRawCodeGenerator);

  // Pre-load manifest to determine which ApplicationInsightsProcessor implementation to use
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
  const manifest = await LLMProviderManager.loadManifestForModelFamily(envVars.LLM);

  // Register the ApplicationInsightsProcessor interface with synchronous factory based on manifest data
  container.register(TOKENS.ApplicationInsightsProcessor, {
    useFactory: () => {
      if (manifest.supportsFullCodebaseAnalysis) {
        return container.resolve(TOKENS.InsightsFromRawCodeGenerator);
      } else {
        return container.resolve(TOKENS.InsightsFromDBGenerator);
      }
    },
  });
  
  console.log("LLM-dependent insights components registered");
}
