/**
 * Centralized regular expression patterns used across JSON sanitization.
 * Having these in one place eliminates magic regex literals and makes maintenance easier.
 */

import { CODE_FENCE_MARKERS } from "./json-processing.config";

/**
 * Code fence regex patterns for removing markdown code blocks.
 * These patterns match various code fence formats that LLMs use to wrap JSON responses.
 */
export const CODE_FENCE_REGEXES = Object.freeze([
  /**
   * Matches JSON code fences: ```json with optional whitespace
   */
  new RegExp(`${CODE_FENCE_MARKERS.JSON}\\s*`, "gi"),
  /**
   * Matches JavaScript code fences: ```javascript with optional whitespace
   */
  new RegExp(`${CODE_FENCE_MARKERS.JAVASCRIPT}\\s*`, "gi"),
  /**
   * Matches TypeScript code fences: ```ts with optional whitespace
   */
  new RegExp(`${CODE_FENCE_MARKERS.TYPESCRIPT}\\s*`, "gi"),
  /**
   * Matches generic code fences: ``` (must be last to avoid matching specific ones)
   */
  new RegExp(CODE_FENCE_MARKERS.GENERIC, "g"),
] as const);

/**
 * Regex patterns for concatenation chain sanitization.
 * These patterns identify and fix JavaScript/Java-style string concatenation in JSON.
 */
export const CONCATENATION_REGEXES = Object.freeze({
  /**
   * Matches identifier-only chains (e.g., BASE_PATH + "/file")
   * Pattern: identifier + identifier + ... (no string literals)
   */
  IDENTIFIER_ONLY_CHAIN: /(:\s*)([A-Za-z_][\w.()]*(?:\s*\+\s*[A-Za-z_][\w.()]*)+)(?=\s*[,}\n])/g,

  /**
   * Matches chains where identifiers precede a string literal
   * Pattern: identifier + identifier + ... + "literal"
   */
  IDENTIFIER_THEN_LITERAL: /(:\s*)(?:[A-Za-z_][\w.()]*\s*\+\s*)+"([^"\n]*)"/g,

  /**
   * Matches chains where identifiers follow a string literal
   * Pattern: "literal" + "literal" + ... + identifier
   */
  LITERAL_THEN_IDENTIFIER:
    /(:\s*)"([^"\n]*)"\s*(?:\+\s*"[^"\n]*"\s*)*\+\s*[A-Za-z_][\w.()]*[^,}\n]*/g,

  /**
   * Matches consecutive string literals
   * Pattern: "literal" + "literal" + ...
   */
  CONSECUTIVE_LITERALS: /(:\s*)"[^"\n]*"(?:\s*\+\s*"[^"\n]*")+/g,
} as const);

/**
 * Binary corruption pattern regex.
 * Matches binary corruption markers like <y_bin_XXX> that appear in LLM responses.
 */
export const BINARY_CORRUPTION_REGEX = /<y_bin_\d+>/g;

/**
 * Generic patterns for malformed JSON sanitization.
 * These patterns are schema-agnostic and catch variations of common JSON errors.
 */
export const MALFORMED_JSON_PATTERNS = Object.freeze({
  /**
   * Matches underscore-prefixed identifiers used as property names.
   * Generic pattern catches any underscore-prefixed identifier (not just uppercase).
   * Example: `{_PARAM_TABLE":` or `{_someValue":`
   */
  UNDERSCORE_PROPERTY_NAME: /\{\s*([_][a-zA-Z0-9_]+)"\s*:\s*"([^"]+)"/g,

  /**
   * Matches LLM artifact properties (extra_*, _llm_*, _ai_*).
   * Generic pattern catches any property that looks like an LLM-generated artifact.
   * Example: `extra_code_analysis:`, `_llm_thoughts:`, `_ai_reasoning:`
   */
  LLM_ARTIFACT_PROPERTY: /((?:extra_|_llm_|_ai_)[a-z_]+)/gi,

  /**
   * Matches LLM artifact properties followed by opening brace.
   * Used to remove entire property blocks that are LLM artifacts.
   * Example: `extra_code_analysis: {` -> remove entire block
   */
  LLM_ARTIFACT_PROPERTY_WITH_BRACE: /([}\],]|\n|^)(\s*)((?:extra_|_llm_|_ai_)[a-z_]+):\s*{/gi,

  /**
   * Matches LLM artifact properties after array closing bracket.
   * Used to add missing commas before extra_* properties.
   * Example: `]\n    extra_text:` -> `],\n    extra_text:`
   */
  LLM_ARTIFACT_AFTER_ARRAY: /(\])\s*\n\s*((?:extra_|_llm_|_ai_)[a-z_]+)\s*:/gi,

  /**
   * Matches YAML-like blocks embedded in JSON.
   * Generic pattern matches extra_* properties or kebab-case metadata blocks.
   * Example: `extra_thoughts: I've identified...` or `semantically-similar-code-detection-results:`
   */
  YAML_LIKE_BLOCK:
    /(\n\s*)((?:extra_|_llm_|_ai_)[a-z_]+|[a-z]+(?:-[a-z]+)+):\s*([\s\S]*?)(?=\n\s*"[a-zA-Z]|\n\s*[}\]]|$)/gi,

  /**
   * Matches LLM artifact attribute assignments.
   * Generic pattern matches any extra_*= style attribute.
   * Example: `extra_text="  "externalReferences":`
   */
  LLM_ARTIFACT_ATTRIBUTE: /(\n\s*)((?:extra_|_llm_|_ai_)[a-z_]+)\s*=\s*"(\s*"[a-zA-Z])/gi,

  /**
   * Matches missing property names with underscore-prefixed fragments.
   * Generic pattern matches short lowercase fragments or any underscore-prefixed identifier.
   * Example: `ce": "value"` or `{_PARAM_TABLE":`
   */
  MISSING_PROPERTY_NAME: /([}\],]|\n|^)(\s*)([a-z]{1,3}|_[a-zA-Z0-9_]+)"\s*:\s*"([^"]+)"/g,
} as const);
