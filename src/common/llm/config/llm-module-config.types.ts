/**
 * Configuration types for the LLM module.
 * These types define the configuration contract that makes the LLM module
 * standalone and independent of any specific DI framework or application structure.
 */

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
}

/**
 * Resolved model URNs (identifiers) for the LLM provider.
 * These are the actual model identifiers that will be used by the provider.
 */
export interface ResolvedModels {
  readonly embeddings: string;
  readonly primaryCompletion: string;
  readonly secondaryCompletion?: string;
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
  readonly modelFamily: string;
  readonly errorLogging: LLMErrorLoggingConfig;
  readonly providerParams: Record<string, unknown>;
  readonly resolvedModels: ResolvedModels;
}
