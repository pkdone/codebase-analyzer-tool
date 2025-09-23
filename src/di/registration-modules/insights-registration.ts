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
export async function registerLLMDependentInsightsComponents(): Promise<void> {
  // Register both insights generator implementations with explicit tokens
  container.registerSingleton(TOKENS.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(TOKENS.InsightsFromRawCodeGenerator, InsightsFromRawCodeGenerator);

  // Register the insights processor selector
  container.registerSingleton(TOKENS.InsightsProcessorSelector, InsightsProcessorSelector);

  // Pre-resolve the selector to determine which processor to use
  const selector = container.resolve<InsightsProcessorSelector>(TOKENS.InsightsProcessorSelector);
  const selectedProcessor = await selector.selectInsightsProcessor();

  // Register the ApplicationInsightsProcessor interface with the pre-selected processor
  container.register(TOKENS.ApplicationInsightsProcessor, {
    useValue: selectedProcessor,
  });

  console.log("LLM-dependent insights components registered");
}
