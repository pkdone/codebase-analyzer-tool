/**
 * Type definitions for the declarative replacement rule system.
 *
 * This module re-exports all types from the canonical location in types/sanitizer-config.types.ts
 * for backwards compatibility. New code should import directly from the shared types module.
 */

// Re-export all types from the canonical shared location
export type {
  ContextInfo,
  ReplacementResult,
  ReplacementFunction,
  DiagnosticMessageFunction,
  ContextCheckFunction,
  ReplacementRule,
  ExecutorOptions,
  RuleExecutionResult,
  LLMSanitizerConfig,
} from "../../../types/sanitizer-config.types";
