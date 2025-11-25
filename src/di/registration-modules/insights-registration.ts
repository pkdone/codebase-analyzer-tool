import { insightsTokens } from "../tokens";
import { registerComponents } from "../registration-utils";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import { RawAnalyzerDrivenByReqsFiles } from "../../components/raw-analysis/raw-analyzer-driven-by-reqs-files";
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
  registerComponents(
    [
      {
        token: insightsTokens.PromptFileInsightsGenerator,
        implementation: RawAnalyzerDrivenByReqsFiles,
      },
      { token: insightsTokens.InsightsFromDBGenerator, implementation: InsightsFromDBGenerator },
      {
        token: insightsTokens.InsightsFromRawCodeGenerator,
        implementation: InsightsFromRawCodeGenerator,
      },
      {
        token: insightsTokens.InsightsProcessorSelector,
        implementation: InsightsProcessorSelector,
      },
    ],
    "Insights components registered",
  );
}
