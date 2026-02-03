/**
 * LLM artifact pattern sanitizer that fixes assorted malformed JSON patterns from LLM responses.
 *
 * This sanitizer uses generic, pattern-based fixes to handle various LLM-specific JSON artifacts:
 * 1. Duplicate/corrupted array entries
 * 2. Truncated property names (uses generic pattern with schema-specific fallback)
 * 3. Text appearing outside string values (descriptive text after closing quotes)
 * 4. Stray text in JSON structures (commentary between objects)
 * 5. Missing quotes after colons
 * 6. Extra properties (extra_thoughts, extra_text)
 * 7. LLM mid-JSON commentary
 *
 * ## Architecture
 * This module uses a pipeline-based architecture where each category of fixes
 * is handled by a dedicated strategy. The strategies are designed to be more generic
 * and catch variations using character classes and lookaheads.
 *
 * @param input - The raw string content to sanitize
 * @param config - Optional configuration for domain-specific sanitization rules
 * @returns Sanitizer result with LLM artifact pattern fixes applied
 */

import type { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { createPipeline } from "./pipeline";
import {
  duplicateEntryRemover,
  textOutsideJsonRemover,
  extraPropertiesRemover,
  propertyNameFixer,
} from "./strategies";

/**
 * The LLM artifact patterns sanitizer pipeline.
 * Strategies are applied in order to handle LLM-specific JSON malformations:
 * 1. Duplicate entries (remove corrupted/duplicate array entries)
 * 2. Property names (truncated, missing quotes - uses same strategy as property-and-value)
 * 3. Text outside JSON (descriptive text, stray comments)
 * 4. Extra properties (LLM artifacts like extra_thoughts)
 */
const llmArtifactPipeline = createPipeline([
  duplicateEntryRemover,
  propertyNameFixer,
  textOutsideJsonRemover,
  extraPropertiesRemover,
]);

/**
 * LLM artifact patterns sanitizer function.
 * Delegates to the pipeline-based implementation.
 */
export const fixLlmArtifactPatterns: Sanitizer = (input, config): SanitizerResult => {
  if (!input) {
    return { content: input, changed: false };
  }

  const pipelineResult = llmArtifactPipeline(input, config);

  return {
    content: pipelineResult.content,
    changed: pipelineResult.changed,
    description: pipelineResult.changed ? "Fixed LLM artifact patterns" : undefined,
    repairs: pipelineResult.repairs,
  };
};
