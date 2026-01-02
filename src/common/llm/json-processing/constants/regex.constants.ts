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
