/**
 * Strategy for fixing assignment syntax issues in JSON.
 * Handles := instead of :, stray text between colon and value, missing quotes.
 *
 * This strategy uses the declarative rule executor pattern for consistency
 * with other JSON sanitization modules.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { executeRulesMultiPass } from "../rules/rule-executor";
import { ASSIGNMENT_RULES } from "../rules/properties";

/**
 * Strategy that normalizes property assignment syntax in JSON.
 * Uses declarative replacement rules for consistent pattern matching.
 *
 * Fixes handled:
 * - Stray text directly after colon (`"prop":strayText": "value"`)
 * - Assignment operator `:=` instead of `:`
 * - Stray minus signs before colons (`"prop":- value`)
 * - Stray text between colon and value (`"prop": strayText": "value"`)
 * - Missing opening quotes on property values (`"prop":value"`)
 * - Unquoted string values (`"prop": unquotedValue,`)
 */
export const assignmentSyntaxFixer: SanitizerStrategy = {
  name: "AssignmentSyntaxFixer",

  apply(input: string, config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, repairs: [] };
    }

    // Execute rules with multi-pass enabled to handle cascading fixes
    const result = executeRulesMultiPass(input, ASSIGNMENT_RULES, { config });

    return {
      content: result.content,
      changed: result.changed,
      repairs: result.repairs ? [...result.repairs] : [],
    };
  },
};
