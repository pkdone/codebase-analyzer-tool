/**
 * Unified sanitizer that fixes property names, property assignment syntax, and value syntax issues.
 *
 * This sanitizer combines the functionality of multiple pattern categories:
 * 1. Concatenation chains (JavaScript-style string concatenation)
 * 2. Property name issues (truncations, typos, unquoted, concatenated, missing quotes)
 * 3. Assignment syntax (:= to :, stray text, unquoted values, missing quotes)
 * 4. Invalid literals (undefined values, corrupted numeric values)
 * 5. Array element issues (missing quotes, missing commas)
 * 6. Unescaped quotes in string values
 * 7. Stray content (AI warnings, package typos, comment markers)
 *
 * ## Architecture
 * This module uses a pipeline-based architecture where each category of fixes
 * is handled by a dedicated strategy. The strategies are composed into a pipeline
 * that executes them in the correct order.
 *
 * @param input - The raw string content to sanitize
 * @param config - Optional configuration for domain-specific sanitization rules
 * @returns Sanitizer result with property and value syntax fixes applied
 */

import type { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { createPipeline } from "./pipeline";
import {
  concatenationFixer,
  propertyNameFixer,
  invalidLiteralFixer,
  assignmentSyntaxFixer,
  arrayElementFixer,
  unescapedQuoteFixer,
  strayContentRemover,
} from "./strategies";

/**
 * The unified syntax sanitizer pipeline.
 * Strategies are applied in the order that produces correct results:
 * 1. Concatenation chains first (may create property name issues)
 * 2. Assignment syntax (fix stray text early, before property name fixes)
 * 3. Array elements (handle array-specific issues BEFORE property names to avoid false matches)
 * 4. Invalid literals (undefined, corrupted numbers - BEFORE property names to avoid quoting _N)
 * 5. Property names (comprehensive property name fixes)
 * 6. Unescaped quotes (escape quotes in strings)
 * 7. Stray content (cleanup AI warnings, comments, etc.)
 */
const unifiedSyntaxPipeline = createPipeline([
  concatenationFixer,
  assignmentSyntaxFixer,
  arrayElementFixer,
  invalidLiteralFixer,
  propertyNameFixer,
  unescapedQuoteFixer,
  strayContentRemover,
]);

/**
 * Unified syntax sanitizer function.
 * Delegates to the pipeline-based implementation.
 */
export const unifiedSyntaxSanitizer: Sanitizer = (input, config): SanitizerResult => {
  if (!input) {
    return { content: input, changed: false };
  }

  const pipelineResult = unifiedSyntaxPipeline(input, config);

  return {
    content: pipelineResult.content,
    changed: pipelineResult.changed,
    description: pipelineResult.changed ? "Fixed property and value syntax" : undefined,
    repairs: pipelineResult.repairs,
  };
};
