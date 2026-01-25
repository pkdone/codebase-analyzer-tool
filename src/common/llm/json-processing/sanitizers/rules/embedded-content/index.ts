/**
 * Embedded content rules module for JSON sanitization.
 * This module aggregates rules for handling non-JSON content embedded in LLM responses.
 *
 * The rules are organized into focused categories:
 * - YAML content rules: Handle YAML-like blocks and values
 * - Extra property rules: Handle extra_*, _llm_*, _ai_* patterns
 * - LLM artifact rules: Handle binary markers, AI warnings, truncation
 * - Stray commentary rules: Handle sentence-like text and conversational artifacts
 */

import type { ReplacementRule } from "../replacement-rule.types";
import { YAML_CONTENT_RULES } from "./yaml-content-rules";
import { EXTRA_PROPERTY_RULES } from "./extra-property-rules";
import { LLM_ARTIFACT_RULES } from "./llm-artifact-rules";
import { STRAY_COMMENTARY_RULES } from "./stray-commentary-rules";

// Re-export individual rule sets for granular access
export { YAML_CONTENT_RULES } from "./yaml-content-rules";
export { EXTRA_PROPERTY_RULES } from "./extra-property-rules";
export { LLM_ARTIFACT_RULES } from "./llm-artifact-rules";
export { STRAY_COMMENTARY_RULES } from "./stray-commentary-rules";

// Re-export helper functions that may be needed by other modules
export { looksLikeNonJsonKey } from "./yaml-content-rules";
export { isValidEmbeddedContentContext } from "./extra-property-rules";

/**
 * All embedded content rules aggregated in the recommended execution order.
 *
 * The order is important:
 * 1. YAML content rules - Remove YAML-like blocks first
 * 2. Extra property rules - Remove extra_*, _llm_*, _ai_* patterns
 * 3. LLM artifact rules - Remove binary markers and AI warnings
 * 4. Stray commentary rules - Clean up remaining sentence-like text
 *
 * This ordering ensures that higher-level patterns are resolved before
 * more specific text detection occurs.
 */
export const EMBEDDED_CONTENT_RULES: readonly ReplacementRule[] = [
  ...YAML_CONTENT_RULES,
  ...EXTRA_PROPERTY_RULES,
  ...LLM_ARTIFACT_RULES,
  ...STRAY_COMMENTARY_RULES,
];
