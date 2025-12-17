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
}

/**
 * Main configuration object for the LLM module.
 * This is the primary interface that consuming applications use to configure
 * the LLM module for their specific needs.
 */
export interface LLMModuleConfig {
  readonly modelFamily: string;
  readonly errorLogging: LLMErrorLoggingConfig;
  readonly providerParameters: Record<string, string>;
}
