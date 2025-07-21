import { container } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import type { EnvVars } from "../../lifecycle/env.types";
import type { InsightsGenerator } from "./insights-generator.interface";
import InsightsFromDBGenerator from "./insights-from-db-generator";
import InsightsFromRawCodeGenerator from "./insights-from-raw-code-generator";
import { llmConfig } from "../../llm/llm.config";

/**
 * Factory function that creates the appropriate InsightsGenerator implementation
 * based on the LLM environment variable.
 */
export function createInsightsGenerator(): InsightsGenerator {
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);

  if (
    llmConfig.LARGE_CONTEXT_LLMS.includes(
      envVars.LLM as (typeof llmConfig.LARGE_CONTEXT_LLMS)[number],
    )
  ) {
    return container.resolve(InsightsFromRawCodeGenerator);
  } else {
    return container.resolve(InsightsFromDBGenerator);
  }
}
