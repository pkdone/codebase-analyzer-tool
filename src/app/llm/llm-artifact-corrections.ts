import type { LLMSanitizerConfig } from "../../common/llm/config/llm-module-config.types";
import { JAVA_SPECIFIC_RULES } from "./rules/java-specific-rules";

/**
 * LLM artifact corrections for handling output issues that cannot be derived from Zod schemas.
 *
 * This module provides sanitizer configuration for fixing LLM-specific output artifacts:
 * - Truncated/corrupted property names (e.g., "purpos" -> "purpose")
 * - Typo corrections (e.g., "cyclometicComplexity" -> "cyclomaticComplexity")
 * - Package name fixes (e.g., "orgapache." -> "org.apache.")
 *
 * **Note:** Property lists (knownProperties, numericProperties, arrayPropertyNames)
 * are automatically extracted from Zod schemas via `extractSchemaMetadata()` in
 * `src/common/llm/json-processing/utils/zod-schema-metadata.ts`. This module only
 * contains corrections for observed LLM artifacts that dynamic extraction cannot handle.
 */

/**
 * Mapping of truncated property name fragments to their full property names.
 *
 * The dynamic matcher handles most truncation patterns (e.g., "purpos" -> "purpose")
 * automatically via prefix matching. Only add entries here for patterns that:
 * 1. Cannot be resolved by prefix/suffix/fuzzy matching
 * 2. Are confirmed to occur in real LLM outputs
 */
const PROPERTY_NAME_MAPPINGS: Readonly<Record<string, string>> = {
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
 * Known property name typo corrections for quoted properties.
 * These handle specific typos that fuzzy matching might not catch or
 * where we want deterministic corrections.
 */
const PROPERTY_TYPO_CORRECTIONS: Readonly<Record<string, string>> = {
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
 * Package name prefix replacements for fixing truncated package names.
 * Specific to Java-style package names in analyzed codebases.
 */
const PACKAGE_NAME_PREFIX_REPLACEMENTS: Readonly<Record<string, string>> = {
  "orgapache.": "org.apache.",
  "orgf.": "org.",
  "orgah.": "org.",
} as const;

/**
 * Package name typo pattern configuration.
 */
interface PackageNameTypoPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

/**
 * Package name typo patterns for fixing common typos in package names.
 */
const PACKAGE_NAME_TYPO_PATTERNS: readonly PackageNameTypoPattern[] = [
  { pattern: /"orgah\./g, replacement: '"org.', description: "Fixed typo: orgah -> org" },
] as const;

/**
 * Returns sanitizer configuration for handling LLM output artifacts.
 *
 * This configuration is merged with dynamically extracted schema metadata by
 * `schemaMetadataToSanitizerConfig()`. The artifact corrections take precedence
 * over dynamic extraction for the mappings they define.
 *
 * Includes Java-specific rules for handling Java code artifacts in JSON responses,
 * as this application primarily analyzes Java codebases.
 *
 * @returns Configuration containing LLM artifact correction mappings
 */
export function getLlmArtifactCorrections(): LLMSanitizerConfig {
  return {
    // Only include artifact corrections - property lists are dynamically extracted from schemas
    propertyNameMappings: PROPERTY_NAME_MAPPINGS,
    propertyTypoCorrections: PROPERTY_TYPO_CORRECTIONS,
    packageNamePrefixReplacements: PACKAGE_NAME_PREFIX_REPLACEMENTS,
    packageNameTypoPatterns: [...PACKAGE_NAME_TYPO_PATTERNS],

    // Include Java-specific rules for handling Java code artifacts in LLM responses.
    // These rules handle cases where LLMs include Java package/import declarations,
    // class definitions, etc., in their JSON outputs when analyzing Java codebases.
    customReplacementRules: JAVA_SPECIFIC_RULES,
  };
}
