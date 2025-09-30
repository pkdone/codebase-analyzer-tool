import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg, logWarningMsg } from "../../common/utils/logging";
import { removeCodeFences } from "./sanitizers/remove-code-fences";
import { removeControlChars } from "./sanitizers/remove-control-chars";
import { extractLargestJsonSpan } from "./sanitizers/extract-largest-json-span";
import { removeTrailingCommas } from "./sanitizers/remove-trailing-commas";
import type { Sanitizer } from "./sanitizers/sanitizers-types";
import { BadResponseContentLLMError } from "../types/llm-errors.types";
import {
  lightCollapseConcatenationChains,
  concatenationChainSanitizer,
} from "./sanitizers/fix-concatenation-chains";
import { overEscapedSequencesSanitizer } from "./sanitizers/fix-over-escaped-sequences";
import { completeTruncatedStructures } from "./sanitizers/complete-truncated-structures";
import { collapseDuplicateJsonObject } from "./sanitizers/collapse-duplicate-json-object";
import { trimWhitespace } from "./sanitizers/trim-whitespace";

/**
 * Interface to ??????????????????????????
 */
interface ParsingOutcome {
  parsed: unknown;
  steps: string[];
  resilientDiagnostics?: string;
}

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
    // Use warning level (not error) since these are informative / non-failing steps.
    logWarningMsg(
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

  /** Strategy definition interface */
  interface Strategy {
    name: string; // step name pushed into steps array on success
    run: () => unknown; // throws to indicate failure, returns parsed object on success
    stopOnError?: (err: unknown) => boolean; // if returns true, abort further strategies rethrowing wrapped error
    captureResilientDiagnostics?: boolean; // mark resilient strategy for diagnostics capture
  }

  // Declarative list preserves previous ordering & semantics.
  const strategies: Strategy[] = [
    {
      name: "extract",
      run: () => extractBalancedJsonThenParse(content),
      // If we truly found no JSON at all we abort early (legacy behaviour)
      stopOnError: (err) => err instanceof Error && err.message === "No JSON content found",
    },
    {
      name: "pre-concat+extract",
      run: () => {
        const pre = lightCollapseConcatenationChains(content);
        return extractBalancedJsonThenParse(pre);
      },
    },
  ];

  // Execute non-resilient strategies linearly.
  for (const strat of strategies) {
    try {
      const parsed = strat.run();
      steps.push(strat.name);
      return { parsed, steps };
    } catch (err) {
      if (strat.stopOnError?.(err)) {
        // Mirror legacy early failure message
        throw new BadResponseContentLLMError(
          `LLM response for resource '${resourceName}' doesn't contain valid JSON content for text`,
          content,
        );
      }
      // otherwise continue to next strategy
    }
  }

  // Final resilient strategy (kept separate for special diagnostics handling)
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
 * Applies a resilient sanitation pipeline to the given raw input.
 */
function applyResilientSanitationPipeline(raw: string): {
  cleaned: string;
  changed: boolean;
  diagnostics: string;
} {
  const original = raw;
  let working = raw;
  const steps: string[] = [];
  // Build as const with satisfies to ensure each element conforms to Sanitizer without
  // triggering unnecessary assertion warnings under strict lint rules.
  const pipeline = [
    removeCodeFences,
    removeControlChars,
    extractLargestJsonSpan,
    collapseDuplicateJsonObject,
    removeTrailingCommas,
    concatenationChainSanitizer,
    overEscapedSequencesSanitizer,
    completeTruncatedStructures,
    trimWhitespace,
  ] satisfies Sanitizer[];
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

/**
 * Ensures that the sanitized JSON does not contain distinct concatenated objects.
 */
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

/**
 * Checks if the given value is LLM-generated content.
 */
function isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  return false;
}

// Test-only named export (kept stable to avoid modifying existing test suite)
export function __testEnsureNoDistinctConcatenatedObjects(
  sanitizedTrimmed: string,
  originalTrimmed: string,
  resourceName: string,
): void {
  ensureNoDistinctConcatenatedObjects(sanitizedTrimmed, originalTrimmed, resourceName);
}
