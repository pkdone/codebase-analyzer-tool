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
 */
export interface LLMSanitizerConfig {
  readonly propertyNameMappings?: Record<string, string>;
  readonly propertyTypoCorrections?: Record<string, string>;
  readonly knownProperties?: readonly string[];
  readonly numericProperties?: readonly string[];
  readonly requiredStringProperties?: readonly string[];
  readonly packageNamePrefixReplacements?: Record<string, string>;
  readonly packageNameTypoPatterns?: {
    pattern: RegExp;
    replacement: string;
    description: string;
  }[];
  readonly arrayPropertyNames?: readonly string[];
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
