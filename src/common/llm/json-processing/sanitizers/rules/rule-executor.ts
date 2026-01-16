/**
 * Rule executor engine for JSON sanitization.
 * Provides centralized execution of replacement rules with:
 * - Automatic isInStringAt checking
 * - DiagnosticCollector management
 * - Context information for advanced rules
 * - Multi-pass execution support
 */

import {
  isInStringAt,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContextSimple,
  isDeepArrayContext,
} from "../../utils/parser-context-utils";
import { DiagnosticCollector } from "../../utils/diagnostic-collector";
import { processingConfig, parsingHeuristics } from "../../constants/json-processing.config";
import type {
  ReplacementRule,
  ExecutorOptions,
  RuleExecutionResult,
  ContextInfo,
} from "./replacement-rule.types";

// Re-export context check functions for backwards compatibility
// These are now defined in parser-context-utils.ts
export { isAfterJsonDelimiter, isInPropertyContext, isDeepArrayContext };

// Alias for backwards compatibility - isInArrayContext was renamed to isInArrayContextSimple
// to distinguish from the position-based isInArrayContext in parser-context-utils
export { isInArrayContextSimple as isInArrayContext };

/** Default maximum number of passes for multi-pass execution */
const DEFAULT_MAX_PASSES = 10;

/**
 * Executes a single replacement rule against the input content.
 *
 * @param content - The content to process
 * @param rule - The rule to execute
 * @param diagnostics - DiagnosticCollector for tracking changes
 * @param config - Optional sanitizer configuration for schema-aware rules
 * @returns Object containing the modified content and whether changes were made
 */
function executeRule(
  content: string,
  rule: ReplacementRule,
  diagnostics: DiagnosticCollector,
  config?: import("../../../config/llm-module-config.types").LLMSanitizerConfig,
): { content: string; changed: boolean } {
  let hasChanges = false;
  const skipInString = rule.skipInString !== false; // Default to true
  const contextLookback = rule.contextLookback ?? parsingHeuristics.CONTEXT_LOOKBACK_LENGTH;

  const result = content.replace(
    rule.pattern,
    (match: string, ...args: (string | number | undefined)[]) => {
      // Extract offset and groups from args
      // The last two arguments from replace are: offset, fullString
      const offset = args.at(-2) as number;
      const groups = args.slice(0, -2) as (string | undefined)[];

      // Skip if inside a string literal (unless disabled)
      if (skipInString && isInStringAt(offset, content)) {
        return match;
      }

      // Build context info for advanced checks
      const contextInfo: ContextInfo = {
        beforeMatch: content.substring(Math.max(0, offset - contextLookback), offset),
        offset,
        fullContent: content,
        groups,
        config,
      };

      // Apply context check if provided
      if (rule.contextCheck && !rule.contextCheck(contextInfo)) {
        return match;
      }

      // Get the replacement
      const replacement = rule.replacement(match, groups, contextInfo);

      // If replacement returns null, skip this match
      if (replacement === null) {
        return match;
      }

      // Only track changes if the replacement is different
      if (replacement !== match) {
        hasChanges = true;

        // Generate and add diagnostic message
        const message =
          typeof rule.diagnosticMessage === "function"
            ? rule.diagnosticMessage(match, groups)
            : rule.diagnosticMessage;
        diagnostics.add(message);
      }

      return replacement;
    },
  );

  return { content: result, changed: hasChanges };
}

/**
 * Executes an array of replacement rules against the input content.
 * Rules are executed in order, with each rule operating on the result of the previous.
 *
 * @param input - The content to sanitize
 * @param rules - Array of replacement rules to execute
 * @param options - Optional configuration for execution
 * @returns The sanitization result
 */
export function executeRules(
  input: string,
  rules: readonly ReplacementRule[],
  options: ExecutorOptions = {},
): RuleExecutionResult {
  if (!input || rules.length === 0) {
    return { content: input, changed: false };
  }

  const maxDiagnostics = options.maxDiagnostics ?? processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY;
  const multiPass = options.multiPass ?? false;
  const maxPasses = options.maxPasses ?? DEFAULT_MAX_PASSES;
  const config = options.config;

  const diagnostics = new DiagnosticCollector(maxDiagnostics);
  let content = input;
  let totalChanged = false;
  let passCount = 0;

  do {
    let passChanged = false;
    passCount++;

    for (const rule of rules) {
      const result = executeRule(content, rule, diagnostics, config);
      content = result.content;
      if (result.changed) {
        passChanged = true;
        totalChanged = true;
      }
    }

    // If not multi-pass or no changes in this pass, stop
    if (!multiPass || !passChanged) {
      break;
    }
  } while (passCount < maxPasses);

  if (!totalChanged) {
    return { content: input, changed: false };
  }

  const collectedRepairs = diagnostics.getAll();
  return {
    content,
    changed: true,
    description: "Fixed malformed JSON patterns",
    repairs: collectedRepairs.length > 0 ? collectedRepairs : undefined,
  };
}

/**
 * Executes rules with multi-pass enabled.
 * Convenience wrapper for executeRules with multiPass: true.
 *
 * @param input - The content to sanitize
 * @param rules - Array of replacement rules to execute
 * @param options - Optional configuration for execution
 * @returns The sanitization result
 */
export function executeRulesMultiPass(
  input: string,
  rules: readonly ReplacementRule[],
  options: Omit<ExecutorOptions, "multiPass"> = {},
): RuleExecutionResult {
  return executeRules(input, rules, { ...options, multiPass: true });
}
