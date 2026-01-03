/**
 * Rules module for JSON sanitization.
 * Provides a declarative, configuration-driven approach to JSON pattern fixes.
 *
 * This module exports:
 * - Type definitions for replacement rules
 * - Rule executor engine
 * - Pre-defined rule sets organized by category
 * - Aggregated ALL_RULES constant for complete sanitization
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
  RuleGroup,
} from "./replacement-rule.types";

// Executor exports
export {
  executeRules,
  executeRulesMultiPass,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContext,
} from "./rule-executor";

// Rule category exports
export { STRAY_CHARACTER_RULES } from "./stray-character-rules";
export { PROPERTY_NAME_RULES } from "./property-name-rules";
export { ARRAY_ELEMENT_RULES } from "./array-element-rules";
export { STRUCTURAL_RULES } from "./structural-rules";
export { EMBEDDED_CONTENT_RULES } from "./embedded-content-rules";

// Import all rules for aggregation
import type { ReplacementRule } from "./replacement-rule.types";
import { STRAY_CHARACTER_RULES } from "./stray-character-rules";
import { PROPERTY_NAME_RULES } from "./property-name-rules";
import { ARRAY_ELEMENT_RULES } from "./array-element-rules";
import { STRUCTURAL_RULES } from "./structural-rules";
import { EMBEDDED_CONTENT_RULES } from "./embedded-content-rules";

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

/**
 * Rule groups for selective application.
 * Use these when you need to apply only specific categories of rules.
 */
export const RULE_GROUPS = {
  /** Rules for removing embedded non-JSON content */
  embedded: EMBEDDED_CONTENT_RULES,
  /** Rules for fixing structural JSON issues */
  structural: STRUCTURAL_RULES,
  /** Rules for removing stray characters */
  strayCharacters: STRAY_CHARACTER_RULES,
  /** Rules for fixing property name issues */
  propertyNames: PROPERTY_NAME_RULES,
  /** Rules for fixing array element issues */
  arrayElements: ARRAY_ELEMENT_RULES,
} as const;

/**
 * Total number of rules available.
 * Useful for diagnostics and logging.
 */
export const TOTAL_RULE_COUNT = ALL_RULES.length;
