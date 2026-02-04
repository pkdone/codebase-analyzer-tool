/**
 * Utilities for detecting stray/unwanted text in JSON content.
 * These helpers identify non-JSON text that LLMs sometimes include in their responses.
 *
 * The detection is structural (pattern-based) rather than relying on hardcoded word lists,
 * making it more robust against different LLM outputs.
 */

import { JSON_KEYWORDS_SET } from "../constants/json-processing.config";
import { STRUCTURAL_PATTERNS } from "../constants/regex.constants";

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
 * Cache for dynamically generated length pattern RegExp objects.
 * Keyed by "minLength-maxLength" to avoid recreating the same pattern.
 */
const LENGTH_PATTERN_CACHE = new Map<string, RegExp>();

/**
 * Gets a cached RegExp for the stray text length pattern.
 * Creates and caches the pattern if not already cached.
 *
 * @param minLength - Minimum length for the pattern
 * @param maxLength - Maximum length for the pattern
 * @returns The cached RegExp pattern
 */
function getCachedLengthPattern(minLength: number, maxLength: number): RegExp {
  const cacheKey = `${minLength}-${maxLength}`;
  let pattern = LENGTH_PATTERN_CACHE.get(cacheKey);
  if (!pattern) {
    pattern = new RegExp(`^[a-z][a-z0-9_-]{${minLength - 1},${maxLength - 1}}$`, "i");
    LENGTH_PATTERN_CACHE.set(cacheKey, pattern);
  }
  return pattern;
}

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

  // Short lowercase words within configured bounds (using cached pattern)
  const lengthPattern = getCachedLengthPattern(opts.minLength, opts.maxLength);
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

/**
 * Checks if text looks like a first-person LLM commentary statement.
 * Detects patterns like "I will", "Let me", "We should", etc. using structural patterns
 * rather than hardcoded phrases.
 *
 * @param text - The text to check
 * @returns True if the text looks like first-person LLM commentary
 */
export function looksLikeFirstPersonStatement(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // Must not contain JSON structural characters
  if (/["{}[\]]/.test(trimmed)) {
    return false;
  }

  // Use the structural pattern for first-person statements
  if (STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test(trimmed)) {
    return true;
  }

  // Additional structural detection: check for common LLM self-reference patterns
  // "I" or "We" followed by any verb-like word (lowercase letters after space)
  if (/^(?:I|We)\s+[a-z]{2,}/i.test(trimmed)) {
    return true;
  }

  // "Let me/us" pattern
  if (/^Let\s+(?:me|us)\s+/i.test(trimmed)) {
    return true;
  }

  // "Now I/we" pattern
  if (/^Now\s+(?:I|we)\s+/i.test(trimmed)) {
    return true;
  }

  // "Here I/we" pattern
  if (/^Here\s+(?:I|we)\s+/i.test(trimmed)) {
    return true;
  }

  // "Moving on" pattern (common LLM transition phrase)
  if (/^Moving\s+on\b/i.test(trimmed)) {
    return true;
  }

  // "Next" at start followed by comma or "I/we"
  if (/^Next[,]?\s+(?:I|we)\s+/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Checks if text contains truncation indicators.
 * Detects patterns like "...", "(truncated)", "etc.", "[more]", etc.
 * Uses structural patterns rather than specific phrases.
 *
 * @param text - The text to check
 * @returns True if the text contains truncation indicators
 */
export function looksLikeTruncationMarker(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // Use the structural pattern for truncation indicators
  if (STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test(trimmed)) {
    return true;
  }

  // Additional structural detection for common truncation patterns

  // Ellipsis at end (2+ dots)
  if (/\.{2,}\s*$/.test(trimmed)) {
    return true;
  }

  // Parenthetical truncation markers: (more), (continues), (omitted), etc.
  if (/\((?:more|continues?|omitted|cut|skipped|remaining)\)/i.test(trimmed)) {
    return true;
  }

  // Bracket truncation markers: [more], [continues], etc.
  if (/\[(?:more|continues?|omitted|cut|skipped|remaining)\]/i.test(trimmed)) {
    return true;
  }

  // "for brevity" or "brevity" patterns
  if (/\bfor\s+brevity\b/i.test(trimmed) || /\bbrevity\b/i.test(trimmed)) {
    return true;
  }

  // "stop here" or "stopping here" patterns
  if (/\bstop(?:ping)?\s+here\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Checks if text looks like sentence-like content using purely structural detection.
 * This is a more permissive version that catches various sentence structures.
 *
 * @param text - The text to check
 * @returns True if the text has sentence-like structure
 */
export function looksLikeSentenceStructure(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length < 5) {
    return false;
  }

  // Must not contain JSON structural characters
  if (/["{}[\]]/.test(trimmed)) {
    return false;
  }

  // Count words (space-separated tokens)
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  // Sentence structure: 3+ words
  if (words.length >= 3) {
    // Check if it's alphabetic content (not just numbers/symbols)
    const alphabeticContent = trimmed.replace(/[^a-zA-Z]/g, "");
    if (alphabeticContent.length > trimmed.length * 0.5) {
      return true;
    }
  }

  // Two words with sentence punctuation
  if (words.length >= 2 && /[.!?]$/.test(trimmed)) {
    return true;
  }

  return false;
}
