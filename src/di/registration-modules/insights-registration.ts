import { insightsTokens } from "../../components/insights/insights.tokens";
import { registerComponents } from "../registration-utils";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import { PromptFileInsightsGenerator } from "../../components/insights/prompt-file-insights-generator";
import { InsightsProcessorSelector } from "../../components/insights/insights-processor-selector";
import { BomAggregator } from "../../components/insights/data-aggregators/bom-aggregator";
import { CodeQualityAggregator } from "../../components/insights/data-aggregators/code-quality-aggregator";
import { JobAggregator } from "../../components/insights/data-aggregators/job-aggregator";
import { ModuleCouplingAggregator } from "../../components/insights/data-aggregators/module-coupling-aggregator";
import { UiAggregator } from "../../components/insights/data-aggregators/ui-aggregator";

/**
 * Register insights-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - Generating insights from database content
 * - Generating insights from raw code
 * - Managing insight generation strategies based on LLM capabilities
 */
export function registerInsightsComponents(): void {
  registerComponents(
    [
      { token: insightsTokens.BomAggregator, implementation: BomAggregator },
      { token: insightsTokens.CodeQualityAggregator, implementation: CodeQualityAggregator },
      { token: insightsTokens.JobAggregator, implementation: JobAggregator },
      {
        token: insightsTokens.ModuleCouplingAggregator,
        implementation: ModuleCouplingAggregator,
      },
      { token: insightsTokens.UiAggregator, implementation: UiAggregator },
    ],
    "Insights components registered",
  );
}

/**
 * Register insights components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentInsightsComponents(): void {
  registerComponents(
    [
      {
        token: insightsTokens.PromptFileInsightsGenerator,
        implementation: PromptFileInsightsGenerator,
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
    "LLM-dependent insights components registered",
  );
}
