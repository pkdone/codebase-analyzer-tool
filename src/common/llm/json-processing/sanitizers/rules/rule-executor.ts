/**
 * Rule executor engine for JSON sanitization.
 * Provides centralized execution of replacement rules with:
 * - Automatic isInStringAt checking
 * - DiagnosticCollector management
 * - Context information for advanced rules
 * - Multi-pass execution support
 */

import { isInStringAt } from "../../utils/parser-context-utils";
import { DiagnosticCollector } from "../../utils/diagnostic-collector";
import {
  processingConfig,
  parsingHeuristics,
} from "../../constants/json-processing.config";
import type {
  ReplacementRule,
  ExecutorOptions,
  RuleExecutionResult,
  ContextInfo,
} from "./replacement-rule.types";

/** Default maximum number of passes for multi-pass execution */
const DEFAULT_MAX_PASSES = 10;

/**
 * Executes a single replacement rule against the input content.
 *
 * @param content - The content to process
 * @param rule - The rule to execute
 * @param diagnostics - DiagnosticCollector for tracking changes
 * @returns Object containing the modified content and whether changes were made
 */
function executeRule(
  content: string,
  rule: ReplacementRule,
  diagnostics: DiagnosticCollector,
): { content: string; changed: boolean } {
  let hasChanges = false;
  const skipInString = rule.skipInString !== false; // Default to true
  const contextLookback =
    rule.contextLookback ?? parsingHeuristics.CONTEXT_LOOKBACK_LENGTH;

  const result = content.replace(rule.pattern, (match: string, ...args: unknown[]) => {
    // Extract offset and groups from args
    // The last two arguments from replace are: offset, fullString
    const argsArray = args as (string | number | undefined)[];
    const offset = argsArray[argsArray.length - 2] as number;
    const groups = argsArray.slice(0, -2) as (string | undefined)[];

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
  });

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

  const diagnostics = new DiagnosticCollector(maxDiagnostics);
  let content = input;
  let totalChanged = false;
  let passCount = 0;

  do {
    let passChanged = false;
    passCount++;

    for (const rule of rules) {
      const result = executeRule(content, rule, diagnostics);
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

  const collectedDiagnostics = diagnostics.getAll();
  return {
    content,
    changed: true,
    description: "Fixed malformed JSON patterns",
    diagnostics: collectedDiagnostics.length > 0 ? collectedDiagnostics : undefined,
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

/**
 * Creates a simple replacement rule with minimal configuration.
 * Useful for straightforward pattern replacements.
 *
 * @param name - Rule name for diagnostics
 * @param pattern - Regex pattern (must have 'g' flag)
 * @param replacement - Static replacement string or function
 * @param diagnosticMessage - Message to log when replacement is made
 * @returns A ReplacementRule object
 */
export function createSimpleRule(
  name: string,
  pattern: RegExp,
  replacement: string | ((match: string, groups: readonly (string | undefined)[]) => string | null),
  diagnosticMessage: string,
): ReplacementRule {
  return {
    name,
    pattern,
    replacement:
      typeof replacement === "string"
        ? () => replacement
        : (match, groups) => replacement(match, groups),
    diagnosticMessage,
  };
}

/**
 * Common context check: validates that the match is after a JSON structural delimiter.
 * Useful for property and value patterns that should only match at valid JSON positions.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match is in a valid JSON structural context
 */
export function isAfterJsonDelimiter(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[}\],]\s*$/.test(beforeMatch) ||
    /^\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT ||
    /,\s*\n\s*$/.test(beforeMatch)
  );
}

/**
 * Common context check: validates that the match is in a property context.
 * Useful for patterns that should only match where a property name is expected.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match is in a property context
 */
export function isInPropertyContext(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[{,]\s*$/.test(beforeMatch) ||
    /}\s*,\s*\n\s*$/.test(beforeMatch) ||
    /]\s*,\s*\n\s*$/.test(beforeMatch) ||
    /\n\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT
  );
}

/**
 * Common context check: validates that the match is in an array context.
 * Useful for patterns that should only match inside arrays.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match appears to be in an array context
 */
export function isInArrayContext(context: ContextInfo): boolean {
  const { beforeMatch } = context;
  return (
    /\[\s*$/.test(beforeMatch) ||
    /,\s*\n\s*$/.test(beforeMatch) ||
    /"\s*,\s*\n\s*$/.test(beforeMatch)
  );
}
