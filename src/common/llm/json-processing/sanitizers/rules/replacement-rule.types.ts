/**
 * Type definitions for the declarative replacement rule system.
 * This module provides interfaces for defining JSON sanitization rules
 * in a configuration-driven manner, eliminating repetitive boilerplate code.
 */

/**
 * Context information passed to rule context checkers.
 * Provides access to the surrounding content for context-aware replacements.
 */
export interface ContextInfo {
  /** The substring before the match (up to 500 chars for performance) */
  readonly beforeMatch: string;
  /** The character offset of the match in the full content */
  readonly offset: number;
  /** The full content being processed */
  readonly fullContent: string;
  /** Captured groups from the regex match (may be undefined for unmatched optional groups) */
  readonly groups: readonly (string | undefined)[];
  /** Optional sanitizer configuration for schema-aware rules */
  readonly config?: import("../../../config/llm-module-config.types").LLMSanitizerConfig;
}

/**
 * Result returned by a replacement function.
 * Return null to skip the replacement (keep original match).
 */
export type ReplacementResult = string | null;

/**
 * Function that generates a replacement string from a match.
 * @param match - The full matched string
 * @param groups - Captured groups from the regex (may be undefined for unmatched optional groups)
 * @param context - Context information for the match
 * @returns The replacement string, or null to skip replacement
 */
export type ReplacementFunction = (
  match: string,
  groups: readonly (string | undefined)[],
  context: ContextInfo,
) => ReplacementResult;

/**
 * Function that generates a diagnostic message from a match.
 * @param match - The full matched string
 * @param groups - Captured groups from the regex (may be undefined for unmatched optional groups)
 * @returns The diagnostic message string
 */
export type DiagnosticMessageFunction = (
  match: string,
  groups: readonly (string | undefined)[],
) => string;

/**
 * Function that checks if a match should be processed based on context.
 * @param context - Context information for the match
 * @returns true if the match should be processed, false to skip
 */
export type ContextCheckFunction = (context: ContextInfo) => boolean;

/**
 * Defines a single replacement rule for JSON sanitization.
 * Rules are applied in order and can be declaratively configured.
 */
export interface ReplacementRule {
  /**
   * Unique name for this rule, used in diagnostics and debugging.
   */
  readonly name: string;

  /**
   * The regex pattern to match. Must have the 'g' flag for global matching.
   */
  readonly pattern: RegExp;

  /**
   * Function that returns the replacement string.
   * Return null to skip the replacement for a particular match.
   */
  readonly replacement: ReplacementFunction;

  /**
   * Message to log when a replacement is made.
   * Can be a static string or a function that generates a dynamic message.
   */
  readonly diagnosticMessage: string | DiagnosticMessageFunction;

  /**
   * Optional function to check if the match should be processed based on context.
   * Called after the isInStringAt check (if enabled).
   * Return true to process, false to skip.
   */
  readonly contextCheck?: ContextCheckFunction;

  /**
   * Whether to skip matches that are inside a JSON string literal.
   * Default: true (skip matches inside strings)
   */
  readonly skipInString?: boolean;

  /**
   * Number of characters before the match to include in beforeMatch context.
   * Default: 500
   */
  readonly contextLookback?: number;
}

/**
 * Options for the rule executor.
 */
export interface ExecutorOptions {
  /**
   * Maximum number of diagnostic messages to collect per execution.
   * Default: 20
   */
  readonly maxDiagnostics?: number;

  /**
   * Whether to run multiple passes until no more changes are made.
   * Default: false (single pass)
   */
  readonly multiPass?: boolean;

  /**
   * Maximum number of passes when multiPass is enabled.
   * Default: 10
   */
  readonly maxPasses?: number;

  /**
   * Optional sanitizer configuration for schema-aware rules.
   * When provided, rules can use schema metadata for smarter property name inference.
   */
  readonly config?: import("../../../config/llm-module-config.types").LLMSanitizerConfig;
}

/**
 * Result of executing replacement rules.
 */
export interface RuleExecutionResult {
  /** The sanitized content */
  readonly content: string;
  /** Whether any changes were made */
  readonly changed: boolean;
  /** Optional description of what was done */
  readonly description?: string;
  /** Repair messages about specific changes made */
  readonly repairs?: readonly string[];
}
