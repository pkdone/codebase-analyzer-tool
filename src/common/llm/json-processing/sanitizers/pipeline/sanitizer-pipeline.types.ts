/**
 * Types for the modular sanitizer pipeline architecture.
 * Enables composable, testable sanitizer strategies.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";

/**
 * Result from a single sanitizer strategy execution.
 */
export interface StrategyResult {
  /** The sanitized content */
  readonly content: string;
  /** Whether the strategy made any changes */
  readonly changed: boolean;
  /** Diagnostic messages for debugging */
  readonly diagnostics: string[];
}

/**
 * Interface for a sanitizer strategy.
 * Each strategy handles a specific category of JSON malformations.
 */
export interface SanitizerStrategy {
  /** Unique name identifying this strategy (for diagnostics) */
  readonly name: string;

  /**
   * Apply the sanitization strategy to the input.
   * @param input - The content to sanitize
   * @param config - Optional sanitizer configuration
   * @returns The result of applying this strategy
   */
  apply(input: string, config?: LLMSanitizerConfig): StrategyResult;
}

/**
 * Configuration options for the sanitizer pipeline.
 */
export interface PipelineConfig {
  /** Maximum number of diagnostic messages to collect per strategy */
  readonly maxDiagnosticsPerStrategy?: number;
  /** Whether to continue processing after a strategy throws an error */
  readonly continueOnError?: boolean;
}

/**
 * Result from executing the complete sanitizer pipeline.
 */
export interface PipelineResult {
  /** The final sanitized content */
  readonly content: string;
  /** Whether any strategy made changes */
  readonly changed: boolean;
  /** Combined description of changes made */
  readonly description?: string;
  /** All diagnostic messages from all strategies */
  readonly diagnostics?: string[];
  /** Names of strategies that made changes */
  readonly appliedStrategies?: string[];
}

/**
 * Default pipeline configuration values.
 */
export const DEFAULT_PIPELINE_CONFIG: Required<PipelineConfig> = {
  maxDiagnosticsPerStrategy: 20,
  continueOnError: true,
} as const;

