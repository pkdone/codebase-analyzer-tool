import { z } from "zod";
import {
  convertNullToUndefined,
  fixCommonPropertyNameTypos,
  coerceStringToArray,
  unwrapJsonSchemaStructure,
  coerceNumericProperties,
  removeIncompleteArrayItems,
} from "../transforms/index.js";
import { type SchemaFixingTransform } from "../sanitizers/index.js";

/**
 * Result type for validation with transforms operations.
 * Includes transform repairs that were applied during the validation process.
 */
export type ValidationWithTransformsResult<T> =
  | { success: true; data: T; transformRepairs: readonly string[] }
  | { success: false; issues: z.ZodIssue[]; transformRepairs: readonly string[] };

/**
 * Schema fixing transformations applied after successful JSON.parse when initial validation fails.
 * These normalize and correct parsed data to help it pass schema validation.
 *
 * Transform order:
 * - removeIncompleteArrayItems: Removes truncated items from end of arrays (must run early)
 * - coerceStringToArray: Converts string values to empty arrays for predefined property names (generic)
 * - convertNullToUndefined: Converts null to undefined for optional fields (generic)
 * - fixCommonPropertyNameTypos: Fixes typos in property names ending with underscore (generic)
 * - coerceNumericProperties: Converts string values to numbers for known numeric properties (generic)
 * - unwrapJsonSchemaStructure: Unwraps when LLM returns JSON Schema instead of data (generic)
 */
const SCHEMA_FIXING_TRANSFORMS: readonly SchemaFixingTransform[] = [
  removeIncompleteArrayItems,
  coerceStringToArray,
  convertNullToUndefined,
  fixCommonPropertyNameTypos,
  coerceNumericProperties,
  unwrapJsonSchemaStructure,
] as const;

/**
 * Creates a validation failure result with transforms for the public API.
 */
function createValidationFailureWithTransforms<T>(
  message: string,
): ValidationWithTransformsResult<T> {
  return {
    success: false,
    issues: [
      {
        code: z.ZodIssueCode.custom,
        path: [],
        message,
      },
    ],
    transformRepairs: [],
  } as ValidationWithTransformsResult<T>;
}

/**
 * Validates parsed data against a Zod schema.
 * Returns a result object that indicates success or failure with detailed context.
 *
 * Internal function used by validateJsonWithTransforms(). Not exported.
 *
 * @param data - The parsed data to validate
 * @param jsonSchema - The Zod schema to validate against
 * @returns A result indicating success with validated data, or failure with validation issues
 */
function attemptValidate<S extends z.ZodType<unknown>>(
  data: unknown,
  jsonSchema: S,
): { success: true; data: z.infer<S> } | { success: false; issues: z.ZodIssue[] } {
  const validation = jsonSchema.safeParse(data);

  if (validation.success) {
    // Explicit cast is required because Zod's safeParse returns 'any' for data when the
    // schema is generic (S extends ZodType). The cast is safe: validation.success === true
    // guarantees the data conforms to S.
    return { success: true, data: validation.data as z.infer<S> };
  } else {
    const issues = validation.error.issues;
    return { success: false, issues };
  }
}

/**
 * Applies all schema fixing transformations to parsed JSON data.
 * Tracks which transforms were applied and returns both the transformed data and the list of applied transforms.
 *
 * Internal function used by validateJsonWithTransforms(). Not exported.
 *
 * @param data - The parsed JSON data to transform
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns The transformed data and a list of transform function names that were applied
 */
function applySchemaFixingTransforms(
  data: unknown,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
): { data: unknown; repairs: readonly string[] } {
  const appliedTransforms: string[] = [];
  let transformedData = data;

  for (const transform of SCHEMA_FIXING_TRANSFORMS) {
    const before = JSON.stringify(transformedData);
    transformedData = transform(transformedData, config);
    const after = JSON.stringify(transformedData);

    // Track if transform made changes (i.e., if JSON string changed)
    if (before !== after) {
      const transformName = (transform as { name?: string }).name ?? "unknown";
      appliedTransforms.push(transformName);
    }
  }

  return {
    data: transformedData,
    repairs: appliedTransforms,
  };
}

/**
 * Repairs and validates parsed data against a Zod schema.
 *
 * This function implements a test-fix-test pattern:
 * 1. First attempts validation without modifications
 * 2. If validation fails, applies schema-fixing transforms (coercing types, fixing typos, etc.)
 * 3. Re-validates after repairs
 *
 * IMPORTANT: The data returned may be different from the input data due to repairs.
 * Repairs include: null→undefined conversion, string→array coercion, typo fixes, etc.
 *
 * The return type is inferred from the provided schema using `z.infer<S>`, ensuring type safety
 * without requiring the caller to explicitly specify the type parameter.
 *
 * @param data - The parsed data to repair and validate
 * @param jsonSchema - The Zod schema to validate against
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns A result indicating success with repaired/validated data and applied repairs, or failure with validation issues
 */
export function repairAndValidateJson<S extends z.ZodType<unknown>>(
  data: unknown,
  jsonSchema: S,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
): ValidationWithTransformsResult<z.infer<S>> {
  // Fail validation early if not JSON
  if (
    !data ||
    (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) ||
    (Array.isArray(data) && data.length === 0)
  ) {
    return createValidationFailureWithTransforms<z.infer<S>>(
      "Data is required for validation and cannot be empty",
    );
  }

  // Try initial validation
  const initialValidation = attemptValidate(data, jsonSchema);

  // If validation succeeded on first attempt, no transforms needed
  if (initialValidation.success) {
    return { success: true, data: initialValidation.data, transformRepairs: [] };
  }

  // Initial validation failed, so apply schema fixing transforms
  const transformResult = applySchemaFixingTransforms(data, config);
  const validationAfterTransforms = attemptValidate(transformResult.data, jsonSchema);

  // Return result with transform repairs included
  if (validationAfterTransforms.success) {
    return {
      success: true,
      data: validationAfterTransforms.data,
      transformRepairs: transformResult.repairs,
    };
  } else {
    return {
      success: false,
      issues: validationAfterTransforms.issues,
      transformRepairs: transformResult.repairs,
    };
  }
}
