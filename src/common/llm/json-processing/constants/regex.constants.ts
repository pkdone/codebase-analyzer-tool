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
 * LLM token artifact regex.
 * Matches LLM token artifacts like <y_bin_XXX> that leak into LLM responses.
 */
export const LLM_TOKEN_ARTIFACT_REGEX = /<y_bin_\d+>/g;

/**
 * Generic structural patterns for detecting non-JSON content.
 * These patterns use structural heuristics rather than hardcoded word lists.
 */
export const STRUCTURAL_PATTERNS = Object.freeze({
  /**
   * Matches sentence-like text structure.
   * Detects text that looks like natural language sentences:
   * - Starts with a letter (capital or lowercase)
   * - Contains multiple words separated by spaces
   * - May end with sentence punctuation
   * Does NOT require specific words - purely structural.
   */
  SENTENCE_LIKE_TEXT: /^[a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z0-9',.-]+){2,}[.!?]?$/,

  /**
   * Matches generic truncation indicators that LLMs insert when cutting off content.
   * Covers: ..., (truncated), (continued), [truncated], etc., and more
   */
  TRUNCATION_INDICATOR:
    /(?:\.{3,}|\((?:truncated|continued|more|etc)\)|\[(?:truncated|continued|more)\]|etc\.?$)/i,

  /**
   * Matches first-person LLM commentary structure.
   * Detects "I/We + verb" patterns that indicate LLM self-reference.
   * Pattern is structural: pronoun + optional adverb + verb form
   */
  FIRST_PERSON_STATEMENT:
    /^(?:I|We|I['']?(?:ll|ve|d|m)|Let\s+me|Let\s+us|Now\s+I|Here\s+I)\s+(?:will|shall|am|have|would|could|should|can|may|might|need|want|'ll|'ve|'d|'m)?\s*[a-z]/i,

  /**
   * Matches a generic dot-separated identifier (e.g., package names, namespaces).
   * Must start with a letter, contain alphanumerics/underscores, and have at least one dot.
   * Schema-agnostic - works for Java, C#, Python, etc.
   */
  DOT_SEPARATED_IDENTIFIER: /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/,

  /**
   * Matches lines that look like code statements (ending with semicolon).
   * Used to detect Java/C#/JavaScript code that leaked into JSON.
   */
  CODE_STATEMENT_LINE: /^[a-zA-Z_][a-zA-Z0-9_.\s<>[\],]*;\s*$/,
} as const);
