/**
 * Sanitizer pipeline that orchestrates the execution of multiple sanitizer strategies.
 * Provides a composable, testable architecture for JSON sanitization.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import { logWarn } from "../../../../utils/logging";
import type { SanitizerStrategy, PipelineConfig, PipelineResult } from "./sanitizer-pipeline.types";
import { DEFAULT_PIPELINE_CONFIG } from "./sanitizer-pipeline.types";

/**
 * Executes a pipeline of sanitizer strategies in sequence.
 *
 * Each strategy receives the output of the previous strategy, allowing
 * for incremental transformation of malformed JSON content.
 *
 * @param strategies - Array of strategies to execute in order
 * @param input - The initial content to sanitize
 * @param config - Optional sanitizer configuration passed to each strategy
 * @param pipelineConfig - Optional pipeline configuration
 * @returns The combined result of all strategies
 */
export function executePipeline(
  strategies: readonly SanitizerStrategy[],
  input: string,
  config?: LLMSanitizerConfig,
  pipelineConfig?: PipelineConfig,
): PipelineResult {
  const opts = { ...DEFAULT_PIPELINE_CONFIG, ...pipelineConfig };

  if (!input) {
    return {
      content: input,
      changed: false,
    };
  }

  let currentContent = input;
  let hasChanges = false;
  const allDiagnostics: string[] = [];
  const appliedStrategies: string[] = [];

  for (const strategy of strategies) {
    try {
      const result = strategy.apply(currentContent, config);

      if (result.changed) {
        currentContent = result.content;
        hasChanges = true;
        appliedStrategies.push(strategy.name);
      }

      // Collect diagnostics up to the limit
      if (result.diagnostics.length > 0) {
        const limitedDiagnostics = result.diagnostics.slice(0, opts.maxDiagnosticsPerStrategy);
        for (const diag of limitedDiagnostics) {
          allDiagnostics.push(`[${strategy.name}] ${diag}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logWarn(`Sanitizer strategy '${strategy.name}' failed: ${errorMsg}`);

      if (!opts.continueOnError) {
        throw error;
      }
      // Continue with current content on error
    }
  }

  // Build result
  return {
    content: currentContent,
    changed: hasChanges,
    ...(hasChanges &&
      appliedStrategies.length > 0 && {
        description: `Applied: ${appliedStrategies.join(", ")}`,
      }),
    ...(allDiagnostics.length > 0 && {
      diagnostics: allDiagnostics,
    }),
    ...(appliedStrategies.length > 0 && {
      appliedStrategies,
    }),
  };
}

/**
 * Creates a reusable pipeline executor with fixed strategies.
 * Useful for creating specialized sanitizer functions.
 *
 * @param strategies - The strategies to include in this pipeline
 * @param pipelineConfig - Optional default pipeline configuration
 * @returns A function that executes the pipeline on given input
 */
export function createPipeline(
  strategies: readonly SanitizerStrategy[],
  pipelineConfig?: PipelineConfig,
): (input: string, config?: LLMSanitizerConfig) => PipelineResult {
  return (input: string, config?: LLMSanitizerConfig) =>
    executePipeline(strategies, input, config, pipelineConfig);
}

/**
 * Converts a PipelineResult to the legacy SanitizerResult format for backwards compatibility.
 */
export function toSanitizerResult(
  pipelineResult: PipelineResult,
): import("../sanitizers-types").SanitizerResult {
  return {
    content: pipelineResult.content,
    changed: pipelineResult.changed,
    description: pipelineResult.description,
    diagnostics: pipelineResult.diagnostics,
  };
}
