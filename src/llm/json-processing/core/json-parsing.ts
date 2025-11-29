import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import {
  convertNullToUndefined,
  fixCommonPropertyNameTypos,
  coerceStringToArray,
  unwrapJsonSchemaStructure,
} from "../transforms/generic/index.js";
import {
  normalizeDatabaseIntegrationArray,
  fixMissingRequiredFields,
} from "../transforms/schema-specific/source-schema-transforms.js";
import {
  fixJsonStructureAndNoise,
  fixJsonSyntax,
  normalizeCharacters,
  fixJsonStructure,
  unifiedSyntaxSanitizer,
  fixBinaryCorruptionPatterns,
  fixHeuristicJsonErrors,
  fixMalformedJsonPatterns,
  type Sanitizer,
  type PostParseTransform,
} from "../sanitizers/index.js";

/**
 * Result type for JSON parsing operations.
 * Uses a discriminated union to distinguish between success and parse errors.
 */
export type ParseResult =
  | { success: true; data: unknown; steps: readonly string[]; diagnostics?: string }
  | { success: false; error: JsonProcessingError; steps: readonly string[]; diagnostics?: string };

/**
 * Unified, ordered pipeline of sanitizers organized into logical phases.
 *
 * The order is critical for effective JSON repair. Sanitizers are organized into phases
 * that reflect the logical progression of fixing JSON issues:
 *
 * Phase 1: Structural & Noise Removal (Consolidated)
 *   Removes formatting artifacts, noise, and fixes high-level structural issues
 *   - fixJsonStructureAndNoise: Consolidated sanitizer that handles:
 *     * Trimming whitespace
 *     * Removing code fences
 *     * Removing invalid prefixes
 *     * Extracting largest JSON span
 *     * Collapsing duplicate objects
 *     * Removing truncation markers
 *
 * Phase 2: Character Normalization
 *   Normalizes escape sequences, control characters, and curly quotes
 *   - normalizeCharacters: Normalize escape sequences, control characters, and curly quotes
 *
 * Phase 3: Syntax Fixes (Consolidated)
 *   Fixes common JSON syntax errors
 *   - fixJsonSyntax: Consolidated sanitizer that handles:
 *     * Adding missing commas
 *     * Removing trailing commas
 *     * Fixing mismatched delimiters
 *     * Completing truncated structures
 *     * Fixing missing array object braces
 *
 * Phase 4: Property & Value Fixes
 *   Fixes property names and value syntax issues
 *   - fixJsonStructure: Post-processing fixes for various structural issues
 *   - unifiedSyntaxSanitizer: Unified property and value syntax fixes
 *   - fixHeuristicJsonErrors: Fixes assorted malformed patterns
 *   - fixMalformedJsonPatterns: Fixes specific malformed patterns
 *
 * Phase 5: Content Fixes
 *   Fixes content corruption
 *   - fixBinaryCorruptionPatterns: Fix binary corruption patterns (e.g., <y_bin_XXX> markers)
 *
 * Note: JSON Schema unwrapping is handled in POST_PARSE_TRANSFORMS after successful parsing,
 * which is more efficient than attempting to parse during sanitization.
 *
 * Each sanitizer only runs if it makes changes. Parsing is attempted after each step,
 * so earlier sanitizers have priority in fixing issues.
 */
const SANITIZATION_PIPELINE_PHASES = [
  // Phase 1: Structural & Noise Removal (Consolidated)
  [fixJsonStructureAndNoise],
  // Phase 2: Character Normalization
  [normalizeCharacters],
  // Phase 3: Syntax Fixes (Consolidated)
  [fixJsonSyntax],
  // Phase 4: Property & Value Fixes
  [fixJsonStructure, unifiedSyntaxSanitizer, fixHeuristicJsonErrors, fixMalformedJsonPatterns],
  // Phase 5: Content Fixes
  [fixBinaryCorruptionPatterns],
] as const satisfies readonly (readonly Sanitizer[])[];

/**
 * Post-parse transformations applied after successful JSON.parse but before validation.
 * These operate on the parsed object structure rather than raw strings.
 *
 * Transform order:
 * - coerceStringToArray: Converts string values to empty arrays for predefined property names (generic)
 * - convertNullToUndefined: Converts null to undefined for optional fields (generic)
 * - fixCommonPropertyNameTypos: Fixes typos in property names ending with underscore (generic)
 * - unwrapJsonSchemaStructure: Unwraps when LLM returns JSON Schema instead of data (generic)
 * - normalizeDatabaseIntegrationArray: Converts databaseIntegration from array to single object (schema-specific)
 * - fixMissingRequiredFields: Adds missing required fields in publicMethods (schema-specific)
 */
const POST_PARSE_TRANSFORMS: readonly PostParseTransform[] = [
  coerceStringToArray,
  convertNullToUndefined,
  fixCommonPropertyNameTypos,
  unwrapJsonSchemaStructure,
  normalizeDatabaseIntegrationArray,
  fixMissingRequiredFields,
] as const;

/**
 * Applies a single sanitizer and updates tracking arrays.
 * Returns the new content and whether changes were made.
 */
function applySanitizerToContent(
  sanitizer: Sanitizer,
  content: string,
  appliedSteps: string[],
  allDiagnostics: string[],
): { newContent: string; changed: boolean } {
  const stepResult = sanitizer(content);
  if (!stepResult.changed) {
    return { newContent: content, changed: false };
  }

  if (stepResult.description) {
    appliedSteps.push(stepResult.description);
  }
  if (stepResult.diagnostics && stepResult.diagnostics.length > 0) {
    allDiagnostics.push(...stepResult.diagnostics);
  }

  return { newContent: stepResult.content, changed: true };
}

/**
 * Attempts to parse the given content as JSON and apply post-parse transformations.
 * Returns a result indicating success or failure.
 */
function attemptParse(
  content: string,
): { success: true; data: unknown } | { success: false; error: Error } {
  let parsedContent: unknown;

  try {
    parsedContent = JSON.parse(content);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  // Apply post-parse transformations
  let transformedContent = parsedContent;
  for (const transform of POST_PARSE_TRANSFORMS) {
    transformedContent = transform(transformedContent);
  }

  return { success: true, data: transformedContent };
}

/**
 * Core loop of the pipeline: tries parsing the raw content first (fast path),
 * then applies sanitizers one by one if the raw parse fails (slow path).
 * Returns success with data if parsing succeeds at any step, or
 * returns failure info if all sanitizers are exhausted.
 */
function executeSanitizationLoop(
  originalContent: string,
  appliedSteps: string[],
  allDiagnostics: string[],
): ParseResult {
  // Fast path: try direct parse first
  const fastPathResult = attemptParse(originalContent);
  if (fastPathResult.success) {
    return {
      success: true,
      data: fastPathResult.data,
      steps: appliedSteps,
      diagnostics: allDiagnostics.length > 0 ? allDiagnostics.join(" | ") : undefined,
    };
  }

  let workingContent = originalContent;
  let lastParseError: Error = fastPathResult.error; // initial parse error

  // Slow path: iterate through phases, then through sanitizers within each phase
  for (const phase of SANITIZATION_PIPELINE_PHASES) {
    for (const sanitizer of phase) {
      const { newContent, changed } = applySanitizerToContent(
        sanitizer,
        workingContent,
        appliedSteps,
        allDiagnostics,
      );
      if (!changed) continue;

      workingContent = newContent;

      const parseResult = attemptParse(workingContent);

      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data,
          steps: appliedSteps,
          diagnostics: allDiagnostics.length > 0 ? allDiagnostics.join(" | ") : undefined,
        };
      }
      lastParseError = parseResult.error;
    }
  }

  // All sanitizers exhausted without success
  const error = new JsonProcessingError(
    JsonProcessingErrorType.PARSE,
    "cannot be parsed to JSON after all sanitization attempts",
    lastParseError,
  );
  return {
    success: false,
    error,
    steps: appliedSteps,
    diagnostics: allDiagnostics.length > 0 ? allDiagnostics.join(" | ") : undefined,
  };
}

/**
 * Parses a JSON string through a multi-stage sanitization and repair pipeline.
 * Returns a result object indicating success or failure with sanitization steps.
 *
 * This function does NOT perform Zod schema validation - it only handles parsing.
 *
 * @param content - The raw JSON string to parse
 * @returns A ParseResult indicating success with parsed data and steps, or failure with an error
 */
export function parseJson(content: string): ParseResult {
  const appliedSteps: string[] = [];
  const allDiagnostics: string[] = [];

  return executeSanitizationLoop(content, appliedSteps, allDiagnostics);
}
