import { container } from "tsyringe";
import { insightsTokens } from "../tokens";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/generators/db-insights-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/generators/raw-code-insights-generator";
import { RawAnalyzerDrivenByReqsFiles } from "../../components/insights/generators/file-driven-insights-generator";
import { InsightsProcessorSelector } from "../../components/insights/insights-processor-selector";

/**
 * Register insights-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - Generating insights from database content
 * - Generating insights from raw code
 * - Managing insight generation strategies based on LLM capabilities
 *
 * All components are registered here since tsyringe uses lazy-loading.
 */
export function registerInsightsComponents(): void {
  container.registerSingleton(
    insightsTokens.PromptFileInsightsGenerator,
    RawAnalyzerDrivenByReqsFiles,
  );
  container.registerSingleton(insightsTokens.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(
    insightsTokens.InsightsFromRawCodeGenerator,
    InsightsFromRawCodeGenerator,
  );
  container.registerSingleton(insightsTokens.InsightsProcessorSelector, InsightsProcessorSelector);
  console.log("Insights components registered");
}
