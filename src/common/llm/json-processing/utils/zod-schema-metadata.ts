/**
 * Lightweight Zod schema metadata extraction utility.
 *
 * Provides schema-agnostic extraction of property names, numeric fields, and array fields
 * from Zod object schemas. This enables dynamic sanitizer configuration based on the
 * actual schema being validated, rather than requiring hardcoded property lists.
 *
 * Design decisions:
 * - Uses Zod's public `shape` property for z.object schemas (stable public API)
 * - Unwraps common wrappers (optional, nullable, default) to find underlying types
 * - Supports nested object schemas with configurable depth
 * - Returns empty metadata for unsupported schema types (graceful fallback)
 */

import { z } from "zod";
import type { LLMSanitizerConfig } from "../../config/llm-module-config.types";

/**
 * Metadata extracted from a Zod schema.
 * Contains property names categorized by their expected types.
 */
export interface SchemaMetadata {
  /** All property names found in the schema */
  readonly allProperties: readonly string[];
  /** Property names that expect numeric values */
  readonly numericProperties: readonly string[];
  /** Property names that expect array values */
  readonly arrayProperties: readonly string[];
}

/**
 * Configuration for schema metadata extraction.
 */
export interface ExtractSchemaMetadataOptions {
  /**
   * Maximum depth for nested object extraction.
   * Default: 2 (extracts properties from top-level and one level of nesting)
   */
  readonly maxDepth?: number;
  /**
   * Whether to normalize property names to lowercase for matching.
   * Default: false
   */
  readonly lowercasePropertyNames?: boolean;
}

const DEFAULT_OPTIONS: Required<ExtractSchemaMetadataOptions> = {
  maxDepth: 2,
  lowercasePropertyNames: false,
};

/**
 * Empty metadata returned for invalid or unsupported schemas.
 */
const EMPTY_METADATA: SchemaMetadata = {
  allProperties: [],
  numericProperties: [],
  arrayProperties: [],
};

/**
 * Safely gets the typeName from a schema's _def property.
 * Returns undefined if the schema doesn't have the expected structure.
 */
function getTypeName(schema: unknown): string | undefined {
  if (
    typeof schema !== "object" ||
    schema === null ||
    !("_def" in schema) ||
    typeof (schema as Record<string, unknown>)._def !== "object" ||
    (schema as Record<string, unknown>)._def === null
  ) {
    return undefined;
  }

  const def = (schema as Record<string, unknown>)._def as Record<string, unknown>;
  if (typeof def.typeName === "string") {
    return def.typeName;
  }
  return undefined;
}

/**
 * Type guard to check if a value is a Zod object schema.
 */
function isZodObject(schema: unknown): schema is z.ZodObject<z.ZodRawShape> {
  return getTypeName(schema) === "ZodObject";
}

/**
 * Type guard to check if a value is a Zod array schema.
 */
function isZodArray(schema: unknown): schema is z.ZodArray<z.ZodType> {
  return getTypeName(schema) === "ZodArray";
}

/**
 * Type guard to check if a value is a Zod number schema.
 */
function isZodNumber(schema: unknown): schema is z.ZodNumber {
  return getTypeName(schema) === "ZodNumber";
}

/**
 * Unwraps common Zod wrappers to find the underlying type.
 * Handles: ZodOptional, ZodNullable, ZodDefault, ZodEffects (preprocess/transform)
 */
function unwrapZodType(schema: unknown): unknown {
  if (typeof schema !== "object" || schema === null || !("_def" in schema)) {
    return schema;
  }

  const def = (schema as Record<string, unknown>)._def as Record<string, unknown>;
  const typeName = def.typeName as string | undefined;

  // Unwrap common wrappers
  if (typeName === "ZodOptional" || typeName === "ZodNullable" || typeName === "ZodDefault") {
    const innerSchema = def.innerType;
    if (innerSchema !== undefined) {
      return unwrapZodType(innerSchema);
    }
  }

  // Unwrap ZodEffects (preprocess, transform, refine)
  if (typeName === "ZodEffects") {
    const innerSchema = def.schema;
    if (innerSchema !== undefined) {
      return unwrapZodType(innerSchema);
    }
  }

  // Unwrap ZodPipeline (pipe)
  if (typeName === "ZodPipeline") {
    const outSchema = def.out;
    if (outSchema !== undefined) {
      return unwrapZodType(outSchema);
    }
  }

  return schema;
}

/**
 * Extracts properties from a Zod object schema shape.
 */
function extractPropertiesFromShape(
  shape: z.ZodRawShape,
  currentDepth: number,
  options: Required<ExtractSchemaMetadataOptions>,
): { all: string[]; numeric: string[]; arrays: string[] } {
  const all: string[] = [];
  const numeric: string[] = [];
  const arrays: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const propName = options.lowercasePropertyNames ? key.toLowerCase() : key;
    all.push(propName);

    // Unwrap to find the underlying type
    const unwrapped = unwrapZodType(value);

    if (isZodNumber(unwrapped)) {
      numeric.push(propName);
    } else if (isZodArray(unwrapped)) {
      arrays.push(propName);
    } else if (isZodObject(unwrapped) && currentDepth < options.maxDepth) {
      // Recursively extract from nested objects
      const nestedShape = unwrapped.shape;
      const nested = extractPropertiesFromShape(nestedShape, currentDepth + 1, options);
      all.push(...nested.all);
      numeric.push(...nested.numeric);
      arrays.push(...nested.arrays);
    }
  }

  return { all, numeric, arrays };
}

/**
 * Extracts metadata from a Zod schema for use in JSON sanitization.
 *
 * This function analyzes a Zod schema and extracts:
 * - All property names (for property name matching/fixing)
 * - Numeric property names (for type coercion)
 * - Array property names (for string-to-array coercion)
 *
 * The extraction is designed to be safe and graceful:
 * - Returns empty metadata for non-object schemas
 * - Handles wrapped types (optional, nullable, default)
 * - Supports configurable nesting depth
 *
 * @param schema - The Zod schema to extract metadata from
 * @param options - Optional configuration for extraction behavior
 * @returns Metadata containing categorized property names
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   count: z.number(),
 *   items: z.array(z.string()),
 * });
 *
 * const metadata = extractSchemaMetadata(schema);
 * // {
 * //   allProperties: ["name", "count", "items"],
 * //   numericProperties: ["count"],
 * //   arrayProperties: ["items"],
 * // }
 * ```
 */
export function extractSchemaMetadata(
  schema: z.ZodType | null | undefined,
  options: ExtractSchemaMetadataOptions = {},
): SchemaMetadata {
  const opts: Required<ExtractSchemaMetadataOptions> = { ...DEFAULT_OPTIONS, ...options };

  // Handle null/undefined gracefully
  if (schema === null || schema === undefined) {
    return EMPTY_METADATA;
  }

  // Unwrap the schema in case it's wrapped (e.g., z.object().optional())
  const unwrapped = unwrapZodType(schema);

  // Only extract from object schemas
  if (!isZodObject(unwrapped)) {
    return EMPTY_METADATA;
  }

  const shape = unwrapped.shape;
  const { all, numeric, arrays } = extractPropertiesFromShape(shape, 1, opts);

  // Deduplicate in case of nested property name collisions
  return {
    allProperties: [...new Set(all)],
    numericProperties: [...new Set(numeric)],
    arrayProperties: [...new Set(arrays)],
  };
}

/**
 * Converts schema metadata to an LLMSanitizerConfig.
 *
 * This bridges the gap between extracted schema metadata and the
 * configuration format expected by the JSON sanitizers.
 *
 * @param metadata - The extracted schema metadata
 * @param existingConfig - Optional existing config to merge with (existing takes precedence)
 * @returns An LLMSanitizerConfig with property lists from the schema
 */
export function schemaMetadataToSanitizerConfig(
  metadata: SchemaMetadata,
  existingConfig?: LLMSanitizerConfig,
): LLMSanitizerConfig {
  // Start with schema-derived values
  const schemaConfig: LLMSanitizerConfig = {
    knownProperties: metadata.allProperties,
    numericProperties: metadata.numericProperties.map((p) => p.toLowerCase()),
    arrayPropertyNames: metadata.arrayProperties,
  };

  // If no existing config, return schema-derived config
  if (!existingConfig) {
    return schemaConfig;
  }

  // Merge: existing config takes precedence for explicit overrides,
  // but we combine property lists for broader coverage
  return {
    // Combine property lists (unique values)
    knownProperties: [
      ...new Set([
        ...(schemaConfig.knownProperties ?? []),
        ...(existingConfig.knownProperties ?? []),
      ]),
    ],
    numericProperties: [
      ...new Set([
        ...(schemaConfig.numericProperties ?? []),
        ...(existingConfig.numericProperties ?? []),
      ]),
    ],
    arrayPropertyNames: [
      ...new Set([
        ...(schemaConfig.arrayPropertyNames ?? []),
        ...(existingConfig.arrayPropertyNames ?? []),
      ]),
    ],
    // Keep explicit mappings from existing config (legacy fallback)
    propertyNameMappings: existingConfig.propertyNameMappings,
    propertyTypoCorrections: existingConfig.propertyTypoCorrections,
    packageNamePrefixReplacements: existingConfig.packageNamePrefixReplacements,
    packageNameTypoPatterns: existingConfig.packageNameTypoPatterns,
  };
}
