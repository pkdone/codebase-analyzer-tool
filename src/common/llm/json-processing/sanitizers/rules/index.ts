/**
 * Rules module for JSON sanitization.
 * Provides a declarative, configuration-driven approach to JSON pattern fixes.
 *
 * This module exports:
 * - Type definitions for replacement rules
 * - Rule executor engine
 * - Pre-defined rule sets organized by category
 * - Aggregated ALL_RULES constant for complete sanitization
 * - Domain-specific rules (e.g., JAVA_SPECIFIC_RULES) for opt-in support
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
} from "./replacement-rule.types";

// Executor exports
export { executeRules, executeRulesMultiPass } from "./rule-executor";
export {
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContextSimple,
} from "../../utils/parser-context-utils";

// Rule category exports
export { STRAY_CHARACTER_RULES } from "./stray-character-rules";
export { PROPERTY_NAME_RULES } from "./property-name-rules";
export { ARRAY_ELEMENT_RULES } from "./array-element-rules";
export { STRUCTURAL_RULES } from "./structural-rules";
export {
  EMBEDDED_CONTENT_RULES,
  YAML_CONTENT_RULES,
  EXTRA_PROPERTY_RULES,
  LLM_ARTIFACT_RULES,
  STRAY_COMMENTARY_RULES,
} from "./embedded-content";

// Domain-specific rule exports (opt-in for specific use cases)
export { JAVA_SPECIFIC_RULES } from "./java-specific-rules";

// Import all rules for aggregation
import type { ReplacementRule } from "./replacement-rule.types";
import { STRAY_CHARACTER_RULES } from "./stray-character-rules";
import { PROPERTY_NAME_RULES } from "./property-name-rules";
import { ARRAY_ELEMENT_RULES } from "./array-element-rules";
import { STRUCTURAL_RULES } from "./structural-rules";
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
 * Note: Domain-specific rules (e.g., JAVA_SPECIFIC_RULES) are NOT included here.
 * They should be injected via LLMSanitizerConfig.customReplacementRules by
 * consuming applications that need them.
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
