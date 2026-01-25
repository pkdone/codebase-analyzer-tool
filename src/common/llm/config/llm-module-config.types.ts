/**
 * Configuration types for the LLM module.
 * These types define the configuration contract that makes the LLM module
 * standalone and independent of any specific DI framework or application structure.
 */

import type { ReplacementRule } from "../json-processing/sanitizers/rules/replacement-rule.types";
import type { LLMProviderManifest } from "../providers/llm-provider.types";
import type { ModelChainEntry, ResolvedModelChain } from "../types/llm-model.types";

/**
 * Registry mapping provider family identifiers to their manifests.
 * This type is used to inject the set of available providers at runtime,
 * allowing consuming applications to control which providers are included.
 */
export type LLMProviderRegistry = ReadonlyMap<string, LLMProviderManifest>;

// Re-export for convenience
export type { ModelChainEntry, ResolvedModelChain };

/**
 * Configuration for error logging behavior.
 */
export interface LLMErrorLoggingConfig {
  readonly errorLogDirectory: string;
  readonly errorLogFilenameTemplate: string;
}

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

/**
 * Main configuration object for the LLM module.
 * This is the primary interface that consuming applications use to configure
 * the LLM module for their specific needs.
 *
 * All environment-specific values should be resolved by the application layer
 * before passing to the LLM module.
 */
export interface LLMModuleConfig {
  /** Error logging configuration */
  readonly errorLogging: LLMErrorLoggingConfig;
  /** Provider-specific parameters (e.g., API keys, endpoints) for all providers in use */
  readonly providerParams: Record<string, unknown>;
  /** Resolved model chain for completions and embeddings */
  readonly resolvedModelChain: ResolvedModelChain;
  /**
   * Registry of available LLM provider manifests.
   * The application layer is responsible for constructing this registry
   * with the specific providers it intends to use.
   */
  readonly providerRegistry: LLMProviderRegistry;
}
