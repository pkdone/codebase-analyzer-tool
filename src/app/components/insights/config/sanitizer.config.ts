import { LLMSanitizerConfig } from "../../../../common/llm/config/llm-module-config.types";

/**
 * Schema-specific constants for sanitizers.
 *
 * **DEPRECATION NOTICE:**
 * These hardcoded property lists are now considered legacy fallback configuration.
 * The JSON processing system now supports dynamic schema metadata extraction via
 * `extractSchemaMetadata()` in `src/common/llm/json-processing/utils/zod-schema-metadata.ts`.
 *
 * When a Zod schema is provided to `processJson()`, property lists are automatically
 * extracted from the schema, making these hardcoded lists unnecessary for most cases.
 *
 * These lists are retained for:
 * 1. Backward compatibility with code that explicitly passes this config
 * 2. Edge cases where dynamic extraction doesn't capture all needed properties
 * 3. Legacy mappings and typo corrections that handle specific LLM artifacts
 *
 * **Recommended approach:**
 * - Pass the Zod schema to `processJson()` via `completionOptions.jsonSchema`
 * - Only use this config for legacy fallback mappings (typo corrections, etc.)
 * - Do not manually maintain `KNOWN_PROPERTIES`, `NUMERIC_PROPERTIES`, or
 *   `ARRAY_PROPERTY_NAMES` - let dynamic extraction handle these
 */

/**
 * Known property names from the sourceSummarySchema.
 *
 * **LEGACY NOTICE:** Consider using dynamic schema extraction via `extractSchemaMetadata()`
 * instead. Properties are now automatically extracted from the Zod schema at runtime when
 * the schema is provided to `processJson()`. This list is maintained for backward
 * compatibility but is no longer the primary source of property names.
 */
export const KNOWN_PROPERTIES: readonly string[] = [
  // Top-level source summary fields
  "name",
  "kind",
  "namespace",
  "purpose",
  "description",
  "implementation",

  // Reference fields
  "internalReferences",
  "externalReferences",
  "references",

  // Public API fields
  "publicConstants",
  "publicFunctions",
  "publicMethods",

  // Function/method fields
  "parameters",
  "returnType",
  "type",
  "value",

  // Integration fields
  "integrationPoints",
  "databaseIntegration",
  "mechanism",
  "path",
  "method",
  "direction",
  "requestBody",
  "responseBody",

  // Quality metrics fields
  "codeQualityMetrics",
  "cyclomaticComplexity",
  "linesOfCode",
  "codeSmells",
  "totalFunctions",
  "averageComplexity",
  "maxComplexity",
  "averageFunctionLength",

  // Database integration fields
  "tablesAccessed",
  "operations",
  "dataInputFields",
] as const;

/**
 * Property names that typically have numeric values.
 * Used to identify properties that should have numeric values rather than strings.
 *
 * **LEGACY NOTICE:** Consider using dynamic schema extraction via `extractSchemaMetadata()`
 * instead. Numeric properties are now automatically detected from z.number() fields in the
 * schema when provided to `processJson()`.
 */
export const NUMERIC_PROPERTIES: readonly string[] = [
  "cyclomaticcomplexity",
  "linesofcode",
  "totalfunctions",
  "averagecomplexity",
  "maxcomplexity",
  "averagefunctionlength",
  "complexity",
  "lines",
  "total",
  "average",
  "max",
  "min",
] as const;

/**
 * Property names that are expected to be arrays.
 * If any of these properties have a string value, they will be converted to an empty array.
 *
 * **LEGACY NOTICE:** Consider using dynamic schema extraction via `extractSchemaMetadata()`
 * instead. Array properties are now automatically detected from z.array() fields in the
 * schema when provided to `processJson()`.
 */
export const ARRAY_PROPERTY_NAMES: readonly string[] = [
  "parameters",
  "dependencies",
  "references",
  "internalReferences",
  "externalReferences",
  "publicConstants",
  "publicFunctions",
  "integrationPoints",
  "codeSmells",
  "tablesAccessed",
  "operations",
  "dataInputFields",
] as const;

/**
 * **Legacy fallback** - Prefer using KNOWN_PROPERTIES with dynamic matching.
 *
 * Mapping of truncated property name fragments to their full property names.
 * Retained for backwards compatibility with specific edge cases not handled by dynamic matching.
 *
 * The dynamic matcher handles most truncation patterns (e.g., "purpos" -> "purpose")
 * automatically via prefix matching. Only add entries here for patterns that:
 * 1. Cannot be resolved by prefix/suffix/fuzzy matching
 * 2. Are confirmed to occur in real LLM outputs
 */
export const PROPERTY_NAME_MAPPINGS: Readonly<Record<string, string>> = {
  // Edge cases where the truncation doesn't match any prefix
  se: "purpose", // "se" could be truncated from "purpo-se" (corrupted)
  alues: "codeSmells", // Truncated "v-alues" suffix
  lues: "codeSmells",
  ues: "codeSmells",
  es: "codeSmells",

  // LLM hallucination patterns (observed in real outputs)
  ethods: "publicFunctions",
  thods: "publicFunctions",
  unctions: "publicFunctions",
  nctions: "publicFunctions",
  nstants: "publicConstants",
  stants: "publicConstants",
  ants: "publicConstants",

  // Truncated compound property names
  egrationPoints: "integrationPoints",
  grationPoints: "integrationPoints",
  rationPoints: "integrationPoints",
  ationPoints: "integrationPoints",
  ernalReferences: "internalReferences",
  alReferences: "externalReferences",
  aseIntegration: "databaseIntegration",
  seIntegration: "databaseIntegration",
  QualityMetrics: "codeQualityMetrics",

  // Parameter field truncations
  ameters: "parameters",
  meters: "parameters",
  eters: "parameters",
  ferences: "references",
} as const;

/**
 * **Legacy fallback** - Prefer using knownProperties with fuzzy matching.
 *
 * Known property name typo corrections for quoted properties.
 * These handle specific typos that fuzzy matching might not catch or
 * where we want deterministic corrections.
 */
export const PROPERTY_TYPO_CORRECTIONS: Readonly<Record<string, string>> = {
  // Trailing underscores (common LLM artifact)
  type_: "type",
  name_: "name",
  value_: "value",
  purpose_: "purpose",
  description_: "description",
  parameters_: "parameters",
  returnType_: "returnType",

  // Specific observed typos
  "return a": "returnType",
  "return ": "returnType",
  cyclometicComplexity: "cyclomaticComplexity",
  cyclometicComplexity_: "cyclomaticComplexity",

  // Common LLM continuation artifacts
  nameprobably: "name",
  namelikely: "name",
  namemaybe: "name",
  typeprobably: "type",
  valueprobably: "value",
} as const;

/**
 * **Domain-specific fallback** - Use sparingly.
 *
 * Package name prefix replacements for fixing truncated package names.
 * This is very specific to Java-style package names and the codebase being analyzed.
 * Consider removing this in favor of generic dot-notation detection.
 */
export const PACKAGE_NAME_PREFIX_REPLACEMENTS: Readonly<Record<string, string>> = {
  // Only keep essential patterns that generic detection can't handle
  "orgapache.": "org.apache.",
  "orgf.": "org.",
  "orgah.": "org.",
} as const;

/**
 * **Domain-specific fallback** - Use sparingly.
 *
 * Package name typo patterns for fixing common typos in package names.
 * Consider removing this in favor of generic detection.
 */
export interface PackageNameTypoPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export const PACKAGE_NAME_TYPO_PATTERNS: readonly PackageNameTypoPattern[] = [
  { pattern: /"orgah\./g, replacement: '"org.', description: "Fixed typo: orgah -> org" },
] as const;

/**
 * Returns the schema-specific sanitizer configuration for code analysis.
 *
 * **DEPRECATION NOTICE:**
 * This function is now considered a legacy fallback. The preferred approach is to
 * pass the Zod schema to `processJson()` via `completionOptions.jsonSchema`, which
 * will automatically extract property metadata using `extractSchemaMetadata()`.
 *
 * This function is retained for:
 * 1. Backward compatibility with existing code
 * 2. Providing legacy mappings (typo corrections, package name fixes) that cannot
 *    be automatically derived from the schema
 *
 * When used together with dynamic schema extraction, the explicit config from this
 * function will be merged with the dynamically extracted metadata, with explicit
 * values taking precedence.
 */
export function getSchemaSpecificSanitizerConfig(): LLMSanitizerConfig {
  return {
    // Primary configuration: dynamic matching
    knownProperties: KNOWN_PROPERTIES,
    numericProperties: NUMERIC_PROPERTIES,
    arrayPropertyNames: ARRAY_PROPERTY_NAMES,

    // Legacy fallback configuration
    propertyNameMappings: PROPERTY_NAME_MAPPINGS,
    propertyTypoCorrections: PROPERTY_TYPO_CORRECTIONS,
    packageNamePrefixReplacements: PACKAGE_NAME_PREFIX_REPLACEMENTS,
    packageNameTypoPatterns: [...PACKAGE_NAME_TYPO_PATTERNS],
  };
}
