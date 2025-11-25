import { container } from "tsyringe";
import { insightsTokens } from "../tokens";
import { registerComponents } from "../registration-utils";

// Insights component imports
import InsightsFromDBGenerator from "../../components/insights/processors/insights-from-db-generator";
import InsightsFromRawCodeGenerator from "../../components/insights/processors/insights-from-raw-code-generator";
import { RawAnalyzerDrivenByReqsFiles } from "../../components/raw-analysis/raw-analyzer-driven-by-reqs-files";
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
 *
 * All components are registered here since tsyringe uses lazy-loading.
 */
export function registerInsightsComponents(): void {
  // Register individual aggregators
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

  // Register aggregators for multi-injection
  container.register(insightsTokens.Aggregator, {
    useToken: insightsTokens.BomAggregator,
  });
  container.register(insightsTokens.Aggregator, {
    useToken: insightsTokens.CodeQualityAggregator,
  });
  container.register(insightsTokens.Aggregator, {
    useToken: insightsTokens.JobAggregator,
  });
  container.register(insightsTokens.Aggregator, {
    useToken: insightsTokens.ModuleCouplingAggregator,
  });
  container.register(insightsTokens.Aggregator, {
    useToken: insightsTokens.UiAggregator,
  });
}
