/**
 * Rules module for JSON sanitization.
 * Provides a declarative, configuration-driven approach to JSON pattern fixes.
 *
 * This module exports:
 * - Type definitions for replacement rules
 * - Rule executor engine
 * - Pre-defined rule sets organized by category
 * - Aggregated ALL_RULES constant for complete sanitization
 *
 * Note: Domain-specific rules (e.g., Java code handling) should be defined
 * in the application layer and injected via LLMSanitizerConfig.customReplacementRules.
 */

// Type exports
export type {
  ReplacementRule,
  ContextInfo,
  ReplacementResult,
  ReplacementFunction,
  DiagnosticMessageFunction,
  ContextCheckFunction,
  ExecutorOptions,
  RuleExecutionResult,
} from "../../../types/sanitizer-config.types";

// Executor exports
export { executeRules, executeRulesMultiPass } from "./rule-executor";

// Rule category exports - organized by subfolder
export { STRAY_CHARACTER_RULES } from "./characters";
export { STRUCTURAL_RULES } from "./structural";
export { PROPERTY_NAME_RULES, ASSIGNMENT_RULES } from "./properties";
export { ARRAY_ELEMENT_RULES } from "./arrays";
export {
  EMBEDDED_CONTENT_RULES,
  YAML_CONTENT_RULES,
  LLM_METADATA_PROPERTY_RULES,
  LLM_ARTIFACT_RULES,
  STRAY_COMMENTARY_RULES,
} from "./embedded-content";

// Import all rules for aggregation
import type { ReplacementRule } from "../../../types/sanitizer-config.types";
import { STRAY_CHARACTER_RULES } from "./characters";
import { STRUCTURAL_RULES } from "./structural";
import { PROPERTY_NAME_RULES } from "./properties";
import { ARRAY_ELEMENT_RULES } from "./arrays";
import { EMBEDDED_CONTENT_RULES } from "./embedded-content";

/**
 * All replacement rules aggregated in the recommended execution order.
 *
 * The order is important:
 * 1. Embedded content rules - Remove non-JSON content first
 * 2. Structural rules - Fix major structural issues
 * 3. Stray character rules - Clean up stray characters
 * 4. Property name rules - Fix property name issues
 * 5. Array element rules - Fix array element issues
 *
 * This ordering ensures that higher-level issues are resolved before
 * more specific pattern matching occurs.
 *
 * Note: Domain-specific rules (e.g., Java code handling) are NOT included here.
 * They should be defined in the application layer and injected via
 * LLMSanitizerConfig.customReplacementRules by consuming applications.
 */
export const ALL_RULES: readonly ReplacementRule[] = [
  // First pass: Remove embedded non-JSON content
  ...EMBEDDED_CONTENT_RULES,

  // Second pass: Fix structural issues
  ...STRUCTURAL_RULES,

  // Third pass: Clean up stray characters
  ...STRAY_CHARACTER_RULES,

  // Fourth pass: Fix property name issues
  ...PROPERTY_NAME_RULES,

  // Fifth pass: Fix array element issues
  ...ARRAY_ELEMENT_RULES,
];
