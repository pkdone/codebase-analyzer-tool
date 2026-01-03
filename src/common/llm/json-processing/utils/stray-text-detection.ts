/**
 * Utilities for detecting stray/unwanted text in JSON content.
 * These helpers identify non-JSON text that LLMs sometimes include in their responses.
 *
 * The detection is structural (pattern-based) rather than relying on hardcoded word lists,
 * making it more robust against different LLM outputs.
 */

import { JSON_KEYWORDS_SET } from "../constants/json-processing.config";

/**
 * Configuration options for stray text detection.
 * Different contexts may require different sensitivity levels.
 */
export interface StrayTextDetectionOptions {
  /** Maximum length of text to consider as stray (default: 15) */
  maxLength?: number;
  /** Minimum length of text to consider as stray (default: 1) */
  minLength?: number;
  /** Whether to detect sentence fragments (default: true) */
  detectSentences?: boolean;
  /** Whether to detect YAML-like patterns (default: false) */
  detectYamlPatterns?: boolean;
  /** Whether to detect variable assignment patterns (default: false) */
  detectAssignmentPatterns?: boolean;
}

/**
 * Default options for general stray text detection.
 */
const DEFAULT_OPTIONS: Required<StrayTextDetectionOptions> = {
  maxLength: 15,
  minLength: 1,
  detectSentences: true,
  detectYamlPatterns: false,
  detectAssignmentPatterns: false,
};

/**
 * Checks if text is a JSON keyword that should never be removed.
 *
 * @param text - The text to check (case-insensitive)
 * @returns True if the text is a JSON keyword
 */
export function isJsonKeyword(text: string): boolean {
  return JSON_KEYWORDS_SET.has(text.toLowerCase());
}

/**
 * Checks if a string looks like stray non-JSON text.
 * This is a general-purpose detector that uses structural patterns.
 *
 * Detection strategy:
 * 1. Never remove JSON keywords (true, false, null, undefined)
 * 2. Remove short lowercase words within length bounds
 * 3. Optionally detect sentence fragments, YAML patterns, and assignments
 *
 * @param text - The text to check
 * @param options - Configuration options for detection sensitivity
 * @returns True if the text looks like stray content that should be removed
 */
export function looksLikeStrayText(text: string, options: StrayTextDetectionOptions = {}): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = text.trim();

  if (trimmed.length === 0) return false;

  // JSON keywords should never be removed
  if (isJsonKeyword(trimmed)) {
    return false;
  }

  // Single characters (always stray if not a keyword)
  if (trimmed.length === 1 && /^[a-zA-Z]$/.test(trimmed)) {
    return true;
  }

  // Short lowercase words within configured bounds
  const lengthPattern = new RegExp(
    `^[a-z][a-z0-9_-]{${opts.minLength - 1},${opts.maxLength - 1}}$`,
    "i",
  );
  if (lengthPattern.test(trimmed)) {
    return true;
  }

  // Sentence fragment detection (text with spaces)
  if (opts.detectSentences) {
    if (/^[a-z][a-z\s]{5,}$/i.test(trimmed) && trimmed.includes(" ")) {
      return true;
    }
  }

  // Variable assignment patterns (config-like text)
  if (opts.detectAssignmentPatterns) {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^\s]+$/.test(trimmed)) {
      return true;
    }
  }

  // YAML-like key: value patterns outside of JSON
  if (opts.detectYamlPatterns) {
    if (/^[a-z][a-z0-9_-]*:\s+[^"{[]/i.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a word looks like stray text before array elements.
 * This is a specialized detector for array context with shorter thresholds.
 *
 * In array context before a quoted string, short lowercase words are almost always
 * stray text because valid JSON array elements start with quotes, numbers, or keywords.
 *
 * @param word - The word to check
 * @returns True if the word looks like stray text that should be removed
 */
export function looksLikeStrayArrayPrefix(word: string): boolean {
  // JSON keywords should never be removed
  if (isJsonKeyword(word)) {
    return false;
  }

  // Short lowercase words (1-7 chars) in array context are almost always stray
  // Extended to 7 chars to catch common stray words like "import", "package"
  if (word.length <= 7 && /^[a-z]+$/.test(word)) {
    return true;
  }

  return false;
}

/**
 * Checks if text looks like stray text before JSON properties.
 * This is a specialized detector for property context.
 *
 * @param word - The word to check
 * @returns True if the word looks like stray text that should be removed
 */
export function looksLikeStrayPropertyPrefix(word: string): boolean {
  // JSON keywords should never be removed
  if (isJsonKeyword(word)) {
    return false;
  }

  // Short lowercase words (2-10 chars) appearing between structural delimiters
  // and property names are almost always stray LLM filler text
  if (/^[a-z]{2,10}$/.test(word)) {
    return true;
  }

  return false;
}

/**
 * Checks if text looks like descriptive/commentary text using structural patterns.
 * Detects sentence-like structures rather than specific words.
 *
 * @param text - The text to check
 * @returns True if the text looks like descriptive/commentary content
 */
export function looksLikeDescriptiveText(text: string): boolean {
  const trimmed = text.trim();

  // Must not contain JSON structural characters
  if (/["{}[\]]/.test(trimmed)) {
    return false;
  }

  // Count space-separated words
  const wordCount = trimmed.split(/\s+/).filter((w) => w.length > 0).length;

  // Text with 3+ words is likely a sentence/commentary
  if (wordCount >= 3) {
    return true;
  }

  // Single words ending with sentence punctuation in JSON context are clearly stray
  if (/[.!?]$/.test(trimmed) && /^[a-z]+[.!?]$/i.test(trimmed)) {
    return true;
  }

  // Text ending with sentence punctuation and has 2+ words
  if (/[.!?]$/.test(trimmed) && wordCount >= 2) {
    return true;
  }

  // Text that is primarily lowercase letters and spaces (prose-like)
  if (/^[a-z][a-z\s]{10,}$/i.test(trimmed)) {
    return true;
  }

  return false;
}
