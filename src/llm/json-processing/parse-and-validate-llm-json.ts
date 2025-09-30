import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { removeCodeFences } from "./sanitizers/remove-code-fences";
import { removeControlChars } from "./sanitizers/remove-control-chars";
import { extractLargestJsonSpan } from "./sanitizers/extract-largest-json-span";
import { removeTrailingCommas } from "./sanitizers/remove-trailing-commas";
import type { Sanitizer, SanitizerResult } from "./sanitizers/sanitizers-types";
import { BadResponseContentLLMError } from "../types/llm-errors.types";
import { ParsingOutcome } from "./processing-types";
import {
  lightCollapseConcatenationChains,
  normalizeConcatenationChains,
} from "./sanitizers/fix-concatenation-chains";
import { repairOverEscapedStringSequences } from "./sanitizers/fix-over-escaped-sequences";
import { completeTruncatedStructures } from "./sanitizers/complete-truncated-structures";

// (Concatenation chain regex logic moved to fix-concatenation-chains sanitizer module.)

/**
 * Convert text content to JSON, trimming the content to only include the JSON part and optionally
 * validate it against a Zod schema.
 */
export function parseAndValidateLLMJsonContent<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
  doWarnOnError = false,
): T {
  if (typeof content !== "string") {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' is not a string, content`,
      JSON.stringify(content),
    );
  }
  // Attempt a fast path parse+validate first (returns null if fallback needed)
  const fastPath = tryFastPathParseAndValidate<T>(
    content,
    resourceName,
    completionOptions,
    doWarnOnError,
  );
  if (fastPath !== null) return fastPath;

  // Otherwise run progressive strategies + validation
  return progressiveParseAndValidate<T>(content, resourceName, completionOptions, doWarnOnError);
}

/**
 * Validate the LLM response content against a Zod schema if provided returning null if validation
 * fails (having logged the error).
 */
export function applyOptionalSchemaValidationToContent<T>(
  content: unknown, // Accept unknown values to be safely handled by Zod validation
  completionOptions: LLMCompletionOptions,
  resourceName: string,
  doWarnOnError = false,
  onValidationIssues?: (issues: unknown) => void,
): T | LLMGeneratedContent | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    const validation = completionOptions.jsonSchema.safeParse(content);

    if (validation.success) {
      return validation.data as T;
    } else {
      const issues = validation.error.issues;
      if (onValidationIssues) onValidationIssues(issues);
      const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(issues)}`;
      if (doWarnOnError) logErrorMsg(errorMessage);
      return null;
    }
  } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
    return content as LLMGeneratedContent;
  } else if (isLLMGeneratedContent(content)) {
    return content;
  } else {
    logErrorMsg(`Content is not valid LLMGeneratedContent for resource: ${resourceName}`);
    return null;
  }
}

/**
 * Attempt direct parse & optional schema validation when the content already appears to be a
 * complete JSON object/array. Returns null if we should fall back to progressive strategies.
 */
function tryFastPathParseAndValidate<T>(
  content: string,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
  doWarnOnError: boolean,
): T | null {
  const trimmed = content.trim();

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const direct = JSON.parse(trimmed) as unknown;
      const validatedDirect = applyOptionalSchemaValidationToContent<T>(
        direct,
        completionOptions,
        resourceName,
        doWarnOnError,
      );
      if (validatedDirect !== null) return validatedDirect as T; // No sanitation steps needed
    } catch {
      // Swallow and fall through to progressive path
    }
  }

  return null;
}

/**
 * Execute progressive parsing strategies and then apply optional schema validation. Throws with
 * contextual details if validation ultimately fails.
 */
function progressiveParseAndValidate<T>(
  originalContent: string,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
  doWarnOnError: boolean,
): T {
  const progressiveResult: ParsingOutcome = parseJsonUsingProgressiveStrategies(
    originalContent,
    resourceName,
  );
  const { parsed, steps, resilientDiagnostics } = progressiveResult;

  if (doWarnOnError && steps.length) {
    const diagSuffix = resilientDiagnostics ? ` | Resilient: ${resilientDiagnostics}` : "";
    logErrorMsg(
      `JSON sanitation steps for resource '${resourceName}': ${steps.join(" -> ")}${diagSuffix}`,
    );
  }

  let validationIssues: unknown = null;
  const validatedContent = applyOptionalSchemaValidationToContent<T>(
    parsed,
    completionOptions,
    resourceName,
    doWarnOnError,
    (issues) => {
      validationIssues = issues;
    },
  );

  if (validatedContent === null) {
    const contentTextWithNoNewlines = originalContent.replace(/\n/g, " ");
    const issuesText = validationIssues
      ? ` Validation issues: ${JSON.stringify(validationIssues)}`
      : "";
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' can be turned into JSON but doesn't validate with the supplied JSON schema.${issuesText}`,
      contentTextWithNoNewlines,
    );
  }

  return validatedContent as T;
}

/**
 * Internal helper providing a linear set of parsing strategies while collecting which steps
 * were required. This replaces the previous deeply nested try/catch control-flow while keeping
 * the exact ordering semantics to avoid regressions.
 */
function parseJsonUsingProgressiveStrategies(
  content: string,
  resourceName: string,
): ParsingOutcome {
  const steps: string[] = [];

  // Strategy 1: Raw extract & parse
  try {
    const parsed = extractBalancedJsonThenParse(content);
    steps.push("extract");
    return { parsed, steps };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "No JSON content found") {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' doesn't contain valid JSON content for text`,
        content,
      );
    }
  }

  // Strategy 2: Pre-concatenation collapse + extract
  try {
    const pre = lightCollapseConcatenationChains(content);
    const parsed = extractBalancedJsonThenParse(pre);
    steps.push("pre-concat+extract");
    return { parsed, steps };
  } catch {
    // continue
  }

  // Strategy 3: Structured attempt sanitization + extract
  try {
    const sanitized = quickRepairMalformedJson(content);
    const parsed = extractBalancedJsonThenParse(sanitized);
    steps.push("attempt-sanitization+extract");
    return { parsed, steps };
  } catch {
    // continue
  }

  // Strategy 4: Resilient sanitation (last resort)
  try {
    const { cleaned, changed, diagnostics } = applyResilientSanitationPipeline(content);
    ensureNoDistinctConcatenatedObjects(cleaned.trim(), content.trim(), resourceName);
    const parsed = JSON.parse(cleaned) as unknown;
    steps.push("resilient-sanitization" + (changed ? "(changed)" : ""));
    return { parsed, steps, resilientDiagnostics: diagnostics };
  } catch (resilientError: unknown) {
    const errDetail =
      resilientError instanceof Error ? resilientError.message : String(resilientError);
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' cannot be parsed to JSON for text`,
      `${content.substring(0, 1200)}\n--- Resilient sanitation failed: ${errDetail}`,
    );
  }
}

/**
 * Extract JSON content from text and parse it.
 * Handles both markdown-wrapped JSON and raw JSON content.
 * Improved algorithm to handle complex nested content with proper string awareness.
 */
function extractBalancedJsonThenParse(textContent: string): unknown {
  // Find JSON content by looking for balanced braces/brackets, handling nested structures
  let jsonMatch: string | null = null;
  const markdownMatch = /```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/.exec(textContent);

  if (markdownMatch) {
    jsonMatch = markdownMatch[1];
  } else {
    // Look for the first opening brace or bracket and find its matching closing one
    const openBraceIndex = textContent.search(/[{[]/);

    if (openBraceIndex !== -1) {
      const startChar = textContent[openBraceIndex];
      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;
      let endIndex = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = openBraceIndex; i < textContent.length; i++) {
        const char = textContent[i];

        // Handle escape sequences
        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        // Handle string boundaries
        if (char === '"') {
          inString = !inString;
          continue;
        }

        // Only count braces when not inside a string
        if (!inString) {
          if (char === startChar) {
            depth++;
          } else if (char === endChar) {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex !== -1) {
        jsonMatch = textContent.substring(openBraceIndex, endIndex + 1);
      } else {
        // Handle truncated JSON - extract from opening brace to end of content
        // This allows sanitization logic to attempt completion
        jsonMatch = textContent.substring(openBraceIndex);
      }
    }
  }

  if (!jsonMatch) throw new Error("No JSON content found");

  try {
    return JSON.parse(jsonMatch);
  } catch {
    // Signal to caller that we found JSON-ish content (so allow sanitization fallback) rather than no JSON at all
    // Use a distinct message different from "No JSON content found" so caller triggers sanitization path
    throw new Error("JsonParseFailed");
  }
}

/**
 * Attempt to fix malformed JSON by handling common LLM response issues.
 * This function addresses various malformed JSON patterns that LLMs commonly produce.
 */
function quickRepairMalformedJson(jsonString: string): string {
  // Only invoked after an initial parse failure; attempt targeted light repairs.
  let updated = jsonString;
  // Strip literal control chars that frequently appear in raw model output
  // eslint-disable-next-line no-control-regex
  updated = updated.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  // Normalize concatenation chains (heavy logic extracted to sanitizer module)
  updated = normalizeConcatenationChains(updated);
  // Repair over-escaped sequences INSIDE string literals only
  updated = updated.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (full, inner: string) => {
    const repaired = repairOverEscapedStringSequences(inner);
    return repaired === inner ? full : `"${repaired}"`;
  });
  // Attempt to complete obviously truncated structures
  const truncatedResult: SanitizerResult = completeTruncatedStructures(updated);
  if (truncatedResult.changed) {
    updated = truncatedResult.content;
  }
  return updated;
}

// (Over-escaped sequence repair now provided by imported repairOverEscapedStringSequences)

// ---------------- Resilient sanitation helpers (restored after refactor) ----------------
function applyResilientSanitationPipeline(raw: string): {
  cleaned: string;
  changed: boolean;
  diagnostics: string;
} {
  const original = raw;
  let working = raw;
  const steps: string[] = [];
  const pipeline: Sanitizer[] = [
    removeCodeFences,
    removeControlChars,
    extractLargestJsonSpan,
    (input) => {
      const dupPattern = /^(\{[\s\S]+\})\s*\1\s*$/;
      if (dupPattern.test(input)) {
        return {
          content: input.replace(dupPattern, "$1"),
          changed: true,
          description: "Collapsed duplicated identical JSON object",
        };
      }
      return { content: input, changed: false };
    },
    removeTrailingCommas,
    (input) => {
      const trimmed = input.trim();
      if (trimmed !== input)
        return { content: trimmed, changed: true, description: "Trimmed whitespace" };
      return { content: input, changed: false };
    },
  ];
  for (const sanitizer of pipeline) {
    const { content, changed, description } = sanitizer(working);
    if (changed && description) steps.push(description);
    working = content;
  }
  return {
    cleaned: working,
    changed: working !== original,
    diagnostics: steps.length ? steps.join(" | ") : "No changes",
  };
}

function ensureNoDistinctConcatenatedObjects(
  sanitizedTrimmed: string,
  originalTrimmed: string,
  resourceName: string,
): void {
  const multiObjRegex = /^\s*(\{[\s\S]*\})\s*(\{[\s\S]*\})\s*$/;
  const multiObjMatch = multiObjRegex.exec(sanitizedTrimmed);
  if (multiObjMatch && multiObjMatch[1] !== multiObjMatch[2]) {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' appears to contain two different concatenated JSON objects and is considered invalid`,
      originalTrimmed.substring(0, 500),
    );
  }
}

// Test-only named export (kept stable to avoid modifying existing test suite)
export function __testEnsureNoDistinctConcatenatedObjects(
  sanitizedTrimmed: string,
  originalTrimmed: string,
  resourceName: string,
): void {
  ensureNoDistinctConcatenatedObjects(sanitizedTrimmed, originalTrimmed, resourceName);
}

function isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  return false;
}
