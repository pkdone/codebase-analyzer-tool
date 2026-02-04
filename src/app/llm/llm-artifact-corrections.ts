import type { LLMSanitizerConfig } from "../../common/llm/config/llm-module-config.types";
import { JAVA_SPECIFIC_RULES } from "../prompts/sources/fragments/languages/java";

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
 * The dynamic matcher in `property-name-matcher.ts` now handles most truncation patterns
 * automatically via prefix, suffix, contains, and fuzzy matching strategies with
 * dynamic Levenshtein thresholds. This includes:
 * - Suffix truncations (e.g., "ameters" -> "parameters")
 * - Prefix truncations (e.g., "purpos" -> "purpose")
 * - Contains matches for medium-length fragments
 *
 * **Only add entries here for patterns that:**
 * 1. Require semantic mapping (fragment maps to different word, not just truncation)
 * 2. Have ambiguous suffix matches (fragment could match multiple properties)
 * 3. Are confirmed edge cases that the dynamic matcher cannot handle
 *
 * @see src/common/llm/json-processing/utils/property-name-matcher.ts
 */
const PROPERTY_NAME_MAPPINGS: Readonly<Record<string, string>> = {
  // Semantic mappings: LLM outputs abbreviated/alternative names for schema properties
  // These require explicit mapping because they're not truncations of the target property
  ethods: "publicFunctions", // LLM outputs "methods" (suffix) but schema uses "publicFunctions"
  thods: "publicFunctions", // Same semantic issue: "methods" -> "publicFunctions"

  // Corrupted/ambiguous edge cases that dynamic matching cannot reliably resolve
  se: "purpose", // Could be from "purpo-se" corruption or other sources
  es: "codeSmells", // Very short, could match many properties ending in "es"
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
