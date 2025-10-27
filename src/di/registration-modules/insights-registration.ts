import { container } from "tsyringe";
import { insightsTokens } from "../../components/insights/insights.tokens";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/insights-from-raw-code-generator";
import { LocalInsightsGenerator } from "../../components/insights/insights-from-raw-code-to-local-files";
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
  container.registerSingleton(insightsTokens.LocalInsightsGenerator, LocalInsightsGenerator);
  container.registerSingleton(insightsTokens.BomAggregator, BomAggregator);
  container.registerSingleton(insightsTokens.CodeQualityAggregator, CodeQualityAggregator);
  container.registerSingleton(insightsTokens.JobAggregator, JobAggregator);
  container.registerSingleton(insightsTokens.ModuleCouplingAggregator, ModuleCouplingAggregator);
  container.registerSingleton(insightsTokens.UiAggregator, UiAggregator);

  console.log("Insights components registered");
}

/**
 * Register insights components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentInsightsComponents(): void {
  container.registerSingleton(insightsTokens.InsightsFromDBGenerator, InsightsFromDBGenerator);
  container.registerSingleton(
    insightsTokens.InsightsFromRawCodeGenerator,
    InsightsFromRawCodeGenerator,
  );
  container.registerSingleton(insightsTokens.InsightsProcessorSelector, InsightsProcessorSelector);
  console.log("LLM-dependent insights components registered");
}
