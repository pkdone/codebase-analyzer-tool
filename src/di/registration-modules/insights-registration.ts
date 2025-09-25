import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import { RawCodeToInsightsFileGenerator } from "../../components/insights/insights-from-raw-code-to-local-files";
import { InsightsProcessorSelector } from "../../components/insights/insights-processor-selector";

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
export function registerLLMDependentInsightsComponents(): void {
  container.registerSingleton(TOKENS.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(TOKENS.InsightsFromRawCodeGenerator, InsightsFromRawCodeGenerator);
  container.registerSingleton(TOKENS.InsightsProcessorSelector, InsightsProcessorSelector);
  console.log("LLM-dependent insights components registered");
}
