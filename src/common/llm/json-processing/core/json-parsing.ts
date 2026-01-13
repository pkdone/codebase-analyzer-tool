import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import {
  fixJsonStructureAndNoise,
  fixJsonSyntax,
  normalizeCharacters,
  removeComments,
  fixJsonStructure,
  unifiedSyntaxSanitizer,
  fixLlmTokenArtifacts,
  fixHeuristicJsonErrors,
  fixMalformedJsonPatterns,
  type Sanitizer,
} from "../sanitizers/index.js";

/**
 * Result type for JSON parsing operations.
 * Uses a discriminated union to distinguish between success and parse errors.
 *
 * @property steps - High-level sanitizer descriptions (e.g., "Fixed JSON structure and noise")
 * @property diagnostics - Low-level mutation steps as individual entries (e.g., ["Removed code fences", "Trimmed whitespace"])
 */
export type ParseResult =
  | { success: true; data: unknown; steps: readonly string[]; diagnostics: readonly string[] }
  | {
      success: false;
      error: JsonProcessingError;
      steps: readonly string[];
      diagnostics: readonly string[];
    };

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
 * Phase 2: Comment Removal
 *   Removes JavaScript-style comments from JSON-like text
 *   - removeComments: Strips single-line (//) and multi-line comments
 *
 * Phase 3: Character Normalization
 *   Normalizes escape sequences, control characters, and curly quotes
 *   - normalizeCharacters: Normalize escape sequences, control characters, and curly quotes
 *
 * Phase 4: Syntax Fixes (Consolidated)
 *   Fixes common JSON syntax errors
 *   - fixJsonSyntax: Consolidated sanitizer that handles:
 *     * Adding missing commas
 *     * Removing trailing commas
 *     * Fixing mismatched delimiters
 *     * Completing truncated structures
 *     * Fixing missing array object braces
 *
 * Phase 5: Property & Value Fixes
 *   Fixes property names and value syntax issues
 *   - fixJsonStructure: Post-processing fixes for various structural issues
 *   - unifiedSyntaxSanitizer: Unified property and value syntax fixes
 *   - fixHeuristicJsonErrors: Fixes assorted malformed patterns
 *   - fixMalformedJsonPatterns: Fixes specific malformed patterns
 *
 * Phase 6: Content Fixes
 *   Fixes content corruption
 *   - fixLlmTokenArtifacts: Fix LLM token artifacts (e.g., <y_bin_XXX> markers)
 *
 * Each sanitizer only runs if it makes changes. Parsing is attempted after each step,
 * so earlier sanitizers have priority in fixing issues.
 */
const SANITIZATION_PIPELINE_PHASES = [
  // Phase 1: Structural & Noise Removal (Consolidated)
  [fixJsonStructureAndNoise],
  // Phase 2: Comment Removal
  [removeComments],
  // Phase 3: Character Normalization
  [normalizeCharacters],
  // Phase 4: Syntax Fixes (Consolidated)
  [fixJsonSyntax],
  // Phase 5: Property & Value Fixes
  [fixJsonStructure, unifiedSyntaxSanitizer, fixHeuristicJsonErrors, fixMalformedJsonPatterns],
  // Phase 6: Content Fixes
  [fixLlmTokenArtifacts],
] as const satisfies readonly (readonly Sanitizer[])[];

/**
 * Builds a success ParseResult with the given data, steps, and diagnostics.
 */
function buildSuccessResult(
  data: unknown,
  steps: readonly string[],
  diagnostics: readonly string[],
): ParseResult {
  return {
    success: true,
    data,
    steps,
    diagnostics,
  };
}

/**
 * Builds a failure ParseResult with the given error, steps, and diagnostics.
 */
function buildFailureResult(
  error: Error,
  steps: readonly string[],
  diagnostics: readonly string[],
): ParseResult {
  return {
    success: false,
    error: new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      "cannot be parsed to JSON after all sanitization attempts",
      error,
    ),
    steps,
    diagnostics,
  };
}

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
  if (!stepResult.changed) return { newContent: content, changed: false };
  if (stepResult.description) appliedSteps.push(stepResult.description);

  if (stepResult.diagnostics && stepResult.diagnostics.length > 0) {
    allDiagnostics.push(...stepResult.diagnostics);
  }

  return { newContent: stepResult.content, changed: true };
}

/**
 * Attempts to parse the given content as JSON.
 * Returns a result indicating success or failure.
 */
function attemptParse(
  content: string,
): { success: true; data: unknown } | { success: false; error: Error } {
  try {
    return { success: true, data: JSON.parse(content) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Parses a JSON string through a multi-stage sanitization and repair pipeline.
 * Returns a result object indicating success or failure with sanitization steps.
 *
 * This function does NOT apply schema fixing transforms - those should be applied
 * conditionally after validation attempts. Use applySchemaFixingTransforms() from json-validating.ts for that.
 *
 * This function does NOT perform Zod schema validation - it only handles parsing.
 *
 * Tries parsing the raw content first (fast path), then applies sanitizers one by one
 * if the raw parse fails (slow path). Returns success with data if parsing succeeds at
 * any step, or returns failure info if all sanitizers are exhausted.
 *
 * @param content - The raw JSON string to parse
 * @returns A ParseResult indicating success with parsed data and steps, or failure with an error
 */
export function parseJsonWithSanitizers(content: string): ParseResult {
  const appliedSteps: string[] = [];
  const allDiagnostics: string[] = [];

  // Fast path: try direct parse first
  const fastPathResult = attemptParse(content);

  if (fastPathResult.success) {
    return buildSuccessResult(fastPathResult.data, appliedSteps, allDiagnostics);
  }

  let workingContent = content;
  let lastParseError: Error = fastPathResult.error;

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
        return buildSuccessResult(parseResult.data, appliedSteps, allDiagnostics);
      }

      lastParseError = parseResult.error;
    }
  }

  // All sanitizers exhausted without success
  return buildFailureResult(lastParseError, appliedSteps, allDiagnostics);
}
