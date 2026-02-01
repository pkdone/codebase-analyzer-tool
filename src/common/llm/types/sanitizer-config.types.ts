/**
 * Shared type definitions for JSON sanitization configuration and rules.
 * This module consolidates types that were previously split across config and json-processing
 * modules, eliminating the design coupling between them.
 *
 * Both LLMSanitizerConfig and ReplacementRule types are co-located here because they
 * reference each other: LLMSanitizerConfig contains customReplacementRules, and
 * ReplacementRule's ContextInfo needs access to the config.
 */

// =============================================================================
// Replacement Rule Types
// =============================================================================

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
  readonly config?: LLMSanitizerConfig;
  /**
   * Cached string boundary checker for O(log N) lookups.
   * Use this instead of scanning fullContent when checking if a position is inside a string.
   */
  readonly isInString?: (position: number) => boolean;
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
  readonly config?: LLMSanitizerConfig;
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

// =============================================================================
// Sanitizer Configuration Types
// =============================================================================

/**
 * Configuration for JSON sanitizers.
 * Allows the consuming application to provide domain-specific sanitization rules.
 *
 * The sanitizer system supports two approaches:
 * 1. **Dynamic matching** (preferred): Provide `knownProperties` and the sanitizer
 *    will use fuzzy matching and prefix detection to fix corrupted property names.
 * 2. **Legacy fallback**: Provide explicit mappings for cases where dynamic matching
 *    isn't sufficient. These fields are maintained for backwards compatibility.
 *
 * The dynamic matching approach is more schema-agnostic and requires less maintenance.
 */
export interface LLMSanitizerConfig {
  /**
   * List of known valid property names for the target schema.
   * Used for dynamic property name matching (prefix, suffix, and fuzzy matching).
   * This is the preferred way to configure property name fixing.
   *
   * @example ["name", "purpose", "description", "parameters", "returnType"]
   */
  readonly knownProperties?: readonly string[];

  /**
   * Property names that typically have numeric values.
   * Used to identify properties that should have numeric values rather than strings.
   *
   * @example ["cyclomaticComplexity", "linesOfCode", "totalFunctions"]
   */
  readonly numericProperties?: readonly string[];

  /**
   * Property names that are expected to be arrays.
   * If any of these properties have a string value, they will be converted to an empty array.
   *
   * @example ["parameters", "dependencies", "references"]
   */
  readonly arrayPropertyNames?: readonly string[];

  /**
   * **Legacy fallback** - Prefer using `knownProperties` with dynamic matching.
   *
   * Explicit mapping of truncated/corrupted property names to their correct names.
   * This is a fallback mechanism for edge cases not handled by dynamic matching.
   * Consider adding entries here only if dynamic matching fails for specific patterns.
   */
  readonly propertyNameMappings?: Record<string, string>;

  /**
   * **Legacy fallback** - Prefer using `knownProperties` with fuzzy matching.
   *
   * Explicit corrections for property name typos.
   * This handles specific typos like "cyclometicComplexity" -> "cyclomaticComplexity".
   * The dynamic matcher should handle most typos, but complex cases may need explicit mapping.
   */
  readonly propertyTypoCorrections?: Record<string, string>;

  /**
   * **Domain-specific fallback** - Use sparingly in generic sanitizers.
   *
   * Mapping of truncated package name prefixes to full prefixes.
   * This is very domain-specific (e.g., Java package names) and should be used sparingly.
   *
   * @example { "orgapache.": "org.apache." }
   */
  readonly packageNamePrefixReplacements?: Record<string, string>;

  /**
   * **Domain-specific fallback** - Use sparingly in generic sanitizers.
   *
   * Patterns for fixing package name typos.
   * This is very domain-specific and should be used sparingly.
   */
  readonly packageNameTypoPatterns?: {
    pattern: RegExp;
    replacement: string;
    description: string;
  }[];

  /**
   * Custom replacement rules to be merged with the default sanitization rules.
   * Use this to inject domain-specific rules (e.g., Java code handling, Python code handling)
   * without modifying the core common library.
   *
   * These rules are appended to the default rule set and executed after the built-in rules.
   *
   * Domain-specific rules should be defined in the application layer. For example,
   * an application analyzing Java codebases might define JAVA_SPECIFIC_RULES to handle
   * Java package/import declarations that LLMs sometimes include in JSON responses.
   *
   * @example
   * ```typescript
   * // Define rules in your application layer
   * const JAVA_SPECIFIC_RULES: ReplacementRule[] = [
   *   { name: "javaPackageInJson", pattern: /.../, replacement: ... }
   * ];
   * const config: LLMSanitizerConfig = {
   *   customReplacementRules: JAVA_SPECIFIC_RULES,
   * };
   * ```
   */
  readonly customReplacementRules?: readonly ReplacementRule[];
}
