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
   * Default: 4 (supports deeply nested schemas like boundedContexts -> aggregates -> entities)
   */
  readonly maxDepth?: number;
  /**
   * Whether to normalize property names to lowercase for matching.
   * Default: false
   */
  readonly lowercasePropertyNames?: boolean;
}

const DEFAULT_OPTIONS: Required<ExtractSchemaMetadataOptions> = {
  maxDepth: 4,
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
 * Interface representing the internal _def structure of a Zod schema.
 * This captures the minimal shape needed for type detection and unwrapping.
 */
interface ZodLikeDef {
  readonly typeName?: string;
  readonly innerType?: unknown;
  readonly schema?: unknown;
  readonly out?: unknown;
  /** For ZodArray: the element type schema */
  readonly type?: unknown;
  /** For ZodUnion: array of option schemas */
  readonly options?: unknown[];
  /** For ZodIntersection: left and right schemas */
  readonly left?: unknown;
  readonly right?: unknown;
}

/**
 * Interface representing a Zod-like schema with a _def property.
 * Used for type-safe access to Zod internals without relying on type assertions.
 */
interface ZodLike {
  readonly _def: ZodLikeDef;
}

/**
 * Type guard to check if a value has a Zod-like structure with a valid _def property.
 * This isolates the type narrowing logic to a single location, eliminating
 * scattered type assertions throughout the metadata extraction code.
 *
 * Uses Object.hasOwn() (ES2022) for safer property checks that don't traverse
 * the prototype chain, avoiding false positives from inherited properties.
 *
 * @param schema - The value to check
 * @returns true if the value has a Zod-like structure
 */
function isZodLike(schema: unknown): schema is ZodLike {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  if (!Object.hasOwn(schema, "_def")) {
    return false;
  }
  const candidate = schema as { _def?: unknown };
  return typeof candidate._def === "object" && candidate._def !== null;
}

/**
 * Safely gets the typeName from a schema's _def property.
 * Returns undefined if the schema doesn't have the expected structure.
 */
function getTypeName(schema: unknown): string | undefined {
  if (!isZodLike(schema)) {
    return undefined;
  }

  const typeName = schema._def.typeName;
  if (typeof typeName === "string") {
    return typeName;
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
 * Type guard to check if a value is a Zod union schema.
 */
function isZodUnion(schema: unknown): schema is z.ZodUnion<[z.ZodType, ...z.ZodType[]]> {
  return getTypeName(schema) === "ZodUnion";
}

/**
 * Type guard to check if a value is a Zod discriminated union schema.
 */
function isZodDiscriminatedUnion(
  schema: unknown,
): schema is z.ZodDiscriminatedUnion<string, z.ZodObject<z.ZodRawShape>[]> {
  return getTypeName(schema) === "ZodDiscriminatedUnion";
}

/**
 * Type guard to check if a value is a Zod intersection schema.
 */
function isZodIntersection(schema: unknown): schema is z.ZodIntersection<z.ZodType, z.ZodType> {
  return getTypeName(schema) === "ZodIntersection";
}

/**
 * Unwraps common Zod wrappers to find the underlying type.
 * Handles: ZodOptional, ZodNullable, ZodDefault, ZodEffects (preprocess/transform)
 */
function unwrapZodType(schema: unknown): unknown {
  if (!isZodLike(schema)) {
    return schema;
  }

  const { typeName, innerType, schema: innerSchema, out: outSchema } = schema._def;

  // Unwrap common wrappers
  if (typeName === "ZodOptional" || typeName === "ZodNullable" || typeName === "ZodDefault") {
    if (innerType !== undefined) {
      return unwrapZodType(innerType);
    }
  }

  // Unwrap ZodEffects (preprocess, transform, refine)
  if (typeName === "ZodEffects") {
    if (innerSchema !== undefined) {
      return unwrapZodType(innerSchema);
    }
  }

  // Unwrap ZodPipeline (pipe)
  if (typeName === "ZodPipeline") {
    if (outSchema !== undefined) {
      return unwrapZodType(outSchema);
    }
  }

  return schema;
}

/**
 * Internal result interface for property extraction.
 */
interface PropertyExtractionResult {
  all: string[];
  numeric: string[];
  arrays: string[];
}

/**
 * Empty result constant to avoid repeated object allocations.
 */
const EMPTY_EXTRACTION_RESULT: PropertyExtractionResult = { all: [], numeric: [], arrays: [] };

/**
 * Merges property extraction results from multiple schemas.
 * This helper consolidates the repetitive merging logic used for unions and intersections.
 *
 * @param schemas - Array of schemas to extract and merge properties from
 * @param currentDepth - Current recursion depth
 * @param options - Extraction options
 * @returns Merged property extraction result
 */
function mergePropertiesFromSchemas(
  schemas: unknown[],
  currentDepth: number,
  options: Required<ExtractSchemaMetadataOptions>,
): PropertyExtractionResult {
  const all: string[] = [];
  const numeric: string[] = [];
  const arrays: string[] = [];

  for (const schema of schemas) {
    const nested = extractPropertiesFromSchema(schema, currentDepth + 1, options);
    all.push(...nested.all);
    numeric.push(...nested.numeric);
    arrays.push(...nested.arrays);
  }

  return { all, numeric, arrays };
}

/**
 * Extracts properties from any Zod schema type, handling objects, arrays, unions, and intersections.
 * This is a recursive helper that traverses the schema structure.
 *
 * @param schema - The Zod schema to extract properties from
 * @param currentDepth - Current recursion depth
 * @param options - Extraction options
 * @returns Extracted property metadata
 */
function extractPropertiesFromSchema(
  schema: unknown,
  currentDepth: number,
  options: Required<ExtractSchemaMetadataOptions>,
): PropertyExtractionResult {
  if (currentDepth > options.maxDepth) {
    return EMPTY_EXTRACTION_RESULT;
  }

  const unwrapped = unwrapZodType(schema);

  // Handle object schemas
  if (isZodObject(unwrapped)) {
    return extractPropertiesFromShape(unwrapped.shape, currentDepth, options);
  }

  // Handle array schemas - extract from the item type if it's an object
  if (isZodArray(unwrapped)) {
    // ZodArray always has an element type in its _def.type property
    const itemType = unwrapped._def.type;
    return extractPropertiesFromSchema(itemType, currentDepth + 1, options);
  }

  // Handle union schemas - extract from all options
  if (isZodUnion(unwrapped) && isZodLike(unwrapped)) {
    const unionOptions = unwrapped._def.options;
    if (Array.isArray(unionOptions)) {
      return mergePropertiesFromSchemas(unionOptions, currentDepth, options);
    }
  }

  // Handle discriminated union schemas - extract from all options
  if (isZodDiscriminatedUnion(unwrapped) && isZodLike(unwrapped)) {
    const unionOptions = unwrapped._def.options;
    if (Array.isArray(unionOptions)) {
      return mergePropertiesFromSchemas(unionOptions, currentDepth, options);
    }
  }

  // Handle intersection schemas - extract from both sides
  if (isZodIntersection(unwrapped)) {
    // ZodIntersection always has left and right in its _def
    const leftSchema = unwrapped._def.left;
    const rightSchema = unwrapped._def.right;
    return mergePropertiesFromSchemas([leftSchema, rightSchema], currentDepth, options);
  }

  return EMPTY_EXTRACTION_RESULT;
}

/**
 * Extracts properties from a Zod object schema shape.
 */
function extractPropertiesFromShape(
  shape: z.ZodRawShape,
  currentDepth: number,
  options: Required<ExtractSchemaMetadataOptions>,
): PropertyExtractionResult {
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
      // Also extract properties from array item type if it's an object
      if (currentDepth < options.maxDepth) {
        // ZodArray always has an element type in its _def.type property
        const itemType = unwrapped._def.type;
        const nested = extractPropertiesFromSchema(itemType, currentDepth + 1, options);
        all.push(...nested.all);
        numeric.push(...nested.numeric);
        arrays.push(...nested.arrays);
      }
    } else if (isZodObject(unwrapped) && currentDepth < options.maxDepth) {
      // Recursively extract from nested objects
      const nestedShape = unwrapped.shape;
      const nested = extractPropertiesFromShape(nestedShape, currentDepth + 1, options);
      all.push(...nested.all);
      numeric.push(...nested.numeric);
      arrays.push(...nested.arrays);
    } else if (isZodUnion(unwrapped) && currentDepth < options.maxDepth) {
      // Extract from all union options
      const nested = extractPropertiesFromSchema(unwrapped, currentDepth + 1, options);
      all.push(...nested.all);
      numeric.push(...nested.numeric);
      arrays.push(...nested.arrays);
    } else if (isZodDiscriminatedUnion(unwrapped) && currentDepth < options.maxDepth) {
      // Extract from all discriminated union options
      const nested = extractPropertiesFromSchema(unwrapped, currentDepth + 1, options);
      all.push(...nested.all);
      numeric.push(...nested.numeric);
      arrays.push(...nested.arrays);
    } else if (isZodIntersection(unwrapped) && currentDepth < options.maxDepth) {
      // Extract from intersection sides
      const nested = extractPropertiesFromSchema(unwrapped, currentDepth + 1, options);
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
