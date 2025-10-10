import { LLMGeneratedContent, LLMCompletionOptions } from "../types/llm.types";
import { logWarningMsg } from "../../common/utils/logging";
import { removeCodeFences } from "./sanitizers/remove-code-fences";
import { removeControlChars } from "./sanitizers/remove-control-chars";
import { extractLargestJsonSpan } from "./sanitizers/extract-largest-json-span";
import { removeTrailingCommas } from "./sanitizers/remove-trailing-commas";
import type { Sanitizer } from "./sanitizers/sanitizers-types";
import { BadResponseContentLLMError, JsonProcessingError } from "../types/llm-errors.types";
import {
  lightCollapseConcatenationChains,
  concatenationChainSanitizer,
} from "./sanitizers/fix-concatenation-chains";
import { overEscapedSequencesSanitizer } from "./sanitizers/fix-over-escaped-sequences";
import { completeTruncatedStructures } from "./sanitizers/complete-truncated-structures";
import { collapseDuplicateJsonObject } from "./sanitizers/collapse-duplicate-json-object";
import { trimWhitespace } from "./sanitizers/trim-whitespace";
import { fixMismatchedDelimiters } from "./sanitizers/fix-mismatched-delimiters";
import { unwrapJsonSchema } from "./sanitizers/unwrap-json-schema";
import { addMissingPropertyCommas } from "./sanitizers/add-missing-property-commas";
import { JsonValidator } from "./json-validator";
import { extractAndParseJson, type ParsingOutcome } from "./utils/json-extractor";
import { unwrapJsonSchemaStructure } from "./utils/post-parse-transforms";

/**
 * JsonProcessor encapsulates the logic for parsing and validating JSON content from LLM responses.
 * It handles both fast-path parsing for well-formed JSON and progressive sanitization strategies
 * for malformed content.
 */
export class JsonProcessor {
  private readonly jsonValidator = new JsonValidator();
  // The ordered pipeline of sanitizers applied when resilient sanitization is needed.
  // Note, the order matters: earlier sanitizers prepare the content for later ones.
  private readonly RESILIENT_SANITIZATION_PIPELINE = [
    removeCodeFences,
    removeControlChars,
    extractLargestJsonSpan,
    unwrapJsonSchema,
    collapseDuplicateJsonObject,
    fixMismatchedDelimiters,
    addMissingPropertyCommas,
    removeTrailingCommas,
    concatenationChainSanitizer,
    overEscapedSequencesSanitizer,
    completeTruncatedStructures,
    trimWhitespace,
  ] as const satisfies readonly Sanitizer[];
  /**
   * Convert text content to JSON, trimming the content to only include the JSON part and optionally
   * validate it against a Zod schema.
   */
  parseAndValidate<T = Record<string, unknown>>(
    content: LLMGeneratedContent,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps = true,
  ): T {
    if (typeof content !== "string") {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' is not a string, content`,
        JSON.stringify(content),
      );
    }

    // Attempt a fast path parse+validate first (returns null if fallback needed)
    const fastPathContent = this.tryFastPathParseAndValidate<T>(
      content,
      resourceName,
      completionOptions,
      logSanitizationSteps,
    );
    if (fastPathContent !== null) return fastPathContent;

    // Otherwise run progressive strategies + validation
    return this.progressiveParseAndValidate<T>(
      content,
      resourceName,
      completionOptions,
      logSanitizationSteps,
    );
  }

  /**
   * Attempt direct parse & optional schema validation when the content already appears to be a
   * complete JSON object/array. Returns null if we should fall back to progressive strategies.
   * This enhanced fast path tries to parse the content directly before any sanitization,
   * significantly improving performance for well-formed JSON responses.
   */
  private tryFastPathParseAndValidate<T>(
    content: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps: boolean,
  ): T | null {
    const trimmed = content.trim();

    try {
      const direct = JSON.parse(trimmed) as unknown;
      const transformed = unwrapJsonSchemaStructure(direct);
      const validatedDirect = this.jsonValidator.validate<T>(
        transformed,
        completionOptions,
        resourceName,
        logSanitizationSteps,
      );
      if (validatedDirect !== null) return validatedDirect as T; // No sanitation steps needed
    } catch {
      // Parsing failed, fall through to progressive strategies
    }

    return null;
  }

  /**
   * Execute progressive parsing strategies and then apply optional schema validation. Throws with
   * contextual details if validation ultimately fails.
   */
  private progressiveParseAndValidate<T>(
    originalContent: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps: boolean,
  ): T {
    const progressiveResult: ParsingOutcome = this.parseJsonUsingProgressiveStrategies(
      originalContent,
      resourceName,
    );
    const { parsed, steps, resilientDiagnostics } = progressiveResult;
    const transformed = unwrapJsonSchemaStructure(parsed);

    if (logSanitizationSteps && steps.length) {
      const diagSuffix = resilientDiagnostics ? ` | Resilient: ${resilientDiagnostics}` : "";
      logWarningMsg(
        `JSON sanitation steps for resource '${resourceName}': ${steps.join(" -> ")}${diagSuffix}`,
      );
    }

    let validationIssues: unknown = null;
    const validatedContent = this.jsonValidator.validate<T>(
      transformed,
      completionOptions,
      resourceName,
      logSanitizationSteps,
      (issues) => {
        validationIssues = issues;
      },
    );

    if (validatedContent === null) {
      const contentTextWithNoNewlines = originalContent.replace(/\n/g, " ");
      const issuesText = validationIssues
        ? ` Validation issues: ${JSON.stringify(validationIssues)}`
        : "";
      const stepsHistory = steps.length > 0 ? ` (Applied sanitization: ${steps.join(" -> ")})` : "";
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' can be turned into JSON but doesn't validate with the supplied JSON schema.${issuesText}${stepsHistory}`,
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
  private parseJsonUsingProgressiveStrategies(
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
        run: () => extractAndParseJson(content),
        // If we truly found no JSON at all we abort early (legacy behaviour)
        stopOnError: (err) => err instanceof Error && err.message === "No JSON content found",
      },
      {
        name: "pre-concat+extract",
        run: () => {
          const pre = lightCollapseConcatenationChains(content);
          return extractAndParseJson(pre);
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
          // Use JsonProcessingError for better debugging context
          throw new JsonProcessingError(
            `LLM response for resource '${resourceName}' doesn't contain valid JSON content`,
            content,
            content, // No sanitization applied yet
            steps,
            err instanceof Error ? err : undefined,
          );
        }
        // otherwise continue to next strategy
      }
    }

    // Final resilient strategy (kept separate for special diagnostics handling)
    let sanitizedContent = content;
    const resilientSteps: string[] = [];

    try {
      const { cleaned, changed, diagnostics } = this.applyResilientSanitationPipeline(content);
      sanitizedContent = cleaned;
      if (changed) resilientSteps.push("resilient-sanitization");
      this.ensureNoDistinctConcatenatedObjects(cleaned.trim(), content.trim(), resourceName);
      const parsed = JSON.parse(cleaned) as unknown;
      steps.push("resilient-sanitization" + (changed ? "(changed)" : ""));
      return { parsed, steps, resilientDiagnostics: diagnostics };
    } catch (resilientError: unknown) {
      throw new JsonProcessingError(
        `LLM response for resource '${resourceName}' cannot be parsed to JSON after all sanitization attempts`,
        content,
        sanitizedContent,
        [...steps, ...resilientSteps],
        resilientError instanceof Error ? resilientError : undefined,
      );
    }
  }

  /**
   * Applies a resilient sanitation pipeline to the given raw input.
   */
  private applyResilientSanitationPipeline(raw: string): {
    cleaned: string;
    changed: boolean;
    diagnostics: string;
  } {
    const original = raw;
    let working = raw;
    const steps: string[] = [];

    for (const sanitizer of this.RESILIENT_SANITIZATION_PIPELINE) {
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
  private ensureNoDistinctConcatenatedObjects(
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
}
