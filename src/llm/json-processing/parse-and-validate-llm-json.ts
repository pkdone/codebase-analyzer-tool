import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { removeCodeFences } from "./sanitizers/remove-code-fences";
import { removeControlChars } from "./sanitizers/remove-control-chars";
import { extractLargestJsonSpan } from "./sanitizers/extract-largest-json-span";
import { removeTrailingCommas } from "./sanitizers/remove-trailing-commas";
import type { Sanitizer } from "./sanitizers/sanitizers-types";
import { BadResponseContentLLMError } from "../types/llm-errors.types";

/** Matches identifier-leading concatenation chains ending with a literal: key: IDENT + IDENT2 + "literal" */
const IDENT_LEADING_WITH_LITERAL_REGEX = /(:\s*)(?:[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*)+"([^"\n]*)"/g;
/** Matches first literal followed by any trailing chain content up to a terminator (comma, brace, newline). */
const FIRST_LITERAL_WITH_TAIL_REGEX = /(:\s*)"([^"\n]*)"([^,}\n]*)/g;
/** Matches identifier-only concatenation chain (no string literals) so it can be collapsed to an empty string. */
// Matches identifier-only concatenation: "key": IDENT + IDENT2 (+ IDENT3 ...) with no string literal
const IDENT_ONLY_CHAIN_REGEX =
  /("[^"]+"\s*:\s*)([A-Za-z_][A-Za-z0-9_.()]*)(?:\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+(?=\s*[},\n])/g;
/** Simple chain segment used for iterative collapsing of mixed literal/identifier chains. */
const SIMPLE_CHAIN_SEGMENT_REGEX = /"[^"\n]*"\s*\+\s*(?:"[^"\n]*"|[A-Za-z_][A-Za-z0-9_.()]*)/;

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

  const { parsed, steps, resilientDiagnostics } = parseJsonUsingProgressiveStrategies(
    content,
    resourceName,
  );

  // Log sanitation steps (excluding pure fast path) when debugging is requested
  if (doWarnOnError && steps.length && steps[0] !== "fast-parse") {
    const diagSuffix = resilientDiagnostics ? ` | Resilient: ${resilientDiagnostics}` : "";
    logErrorMsg(
      `JSON sanitation steps for resource '${resourceName}': ${steps.join(" -> ")}${diagSuffix}`,
    );
  }

  // Perform Zod schema validation
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
    const contentTextWithNoNewlines = content.replace(/\n/g, " ");
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
 * Internal helper providing a linear set of parsing strategies while collecting which steps
 * were required. This replaces the previous deeply nested try/catch control-flow while keeping
 * the exact ordering semantics to avoid regressions.
 */
function parseJsonUsingProgressiveStrategies(
  content: string,
  resourceName: string,
): { parsed: unknown; steps: string[]; resilientDiagnostics?: string } {
  const steps: string[] = [];
  const trimmed = content.trim();

  // Strategy 1: Fast direct parse
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      steps.push("fast-parse");
      return { parsed: json, steps };
    } catch {
      // swallow and proceed
    }
  }

  // Strategy 2: Raw extract & parse
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

  // Strategy 3: Pre-concatenation collapse + extract
  try {
    const pre = lightCollapseConcatenationChains(content);
    const parsed = extractBalancedJsonThenParse(pre);
    steps.push("pre-concat+extract");
    return { parsed, steps };
  } catch {
    // continue
  }

  // Strategy 4: Structured attempt sanitization + extract
  try {
    const sanitized = quickRepairMalformedJson(content);
    const parsed = extractBalancedJsonThenParse(sanitized);
    steps.push("attempt-sanitization+extract");
    return { parsed, steps };
  } catch {
    // continue
  }

  // Strategy 5: Resilient sanitation (last resort)
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
 * Lightweight pre-sanitization applied before initial parse attempt. Focuses solely on
 * collapsing obvious concatenation chains to maximize chance of a first-pass JSON.parse success.
 */
function lightCollapseConcatenationChains(raw: string): string {
  if (!raw.includes("+") || !raw.includes('"')) return raw;
  const simpleChain = SIMPLE_CHAIN_SEGMENT_REGEX;
  let updated = raw;
  // Collapse identifier-only chains (no literals) -> empty string literal
  updated = updated.replace(IDENT_ONLY_CHAIN_REGEX, (_m, pfx) => `${pfx}""`);
  // Handle identifier-only chain WITHOUT trailing comma/brace yet (e.g. end of object before sanitization closes it)
  updated = updated.replace(
    /(:\s*)([A-Za-z_][A-Za-z0-9_.()]*\s*(?:\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+)(?=\s*[}\n])/g,
    (_m, pfx) => `${pfx}""`,
  );
  // Collapse identifier-leading chains ending with a literal -> keep that literal
  updated = updated.replace(IDENT_LEADING_WITH_LITERAL_REGEX, (_m, pfx, lit) => `${pfx}"${lit}"`);
  // Trim everything after first literal if chain contains any identifier(s)
  updated = updated.replace(
    FIRST_LITERAL_WITH_TAIL_REGEX,
    (m: string, pfx: string, lit: string, tail: string) => {
      if (!tail || typeof tail !== "string" || !tail.includes("+")) {
        return m; // no concatenation
      }
      if (/[+]\s*[A-Za-z_][A-Za-z0-9_.()]*/.test(tail)) {
        return `${pfx}"${lit}"`;
      }
      return m;
    },
  );
  let safety = 0;

  while (simpleChain.test(updated) && safety < 50) {
    safety += 1;
    // Identifier-leading simple chains: key: IDENT + "literal" -> keep literal only
    updated = updated.replace(
      /(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"([^"\n]*)"/g,
      (_m, pfx, lit) => `${pfx}"${lit}"`,
    );
    // Collapse chains with multiple literals before an identifier to only the first literal
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,12}\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Collapse any literal + identifier (+ literals) sequence to first literal
    updated = updated.replace(/"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b/g, (match) => {
      const reFirst = /^"[^"\n]*"/;
      const firstLit = reFirst.exec(match);
      return firstLit ? firstLit[0] : match;
    });
    // After collapsing, strip any remaining literal+identifier(+literal) sequences to just the first literal
    updated = updated.replace(
      /(:\s*)"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (full, pfx) => {
        const lit = /"[^"\n]*"/.exec(full);
        return lit ? `${pfx}${lit[0]}` : full;
      },
    );
    // Then merge pure literal-only limited chains
    updated = updated.replace(/"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,6}(?=\s*[,}\]])/g, (chain) => {
      const tokens = chain
        .split(/\s*\+\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.length) return chain;
      const merged = tokens
        .map((t) => {
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.substring(1, t.length - 1);
          }
          return t;
        })
        .join("");
      return `"${merged}"`;
    });
  }

  // Final pass: any chain with an identifier anywhere: "lit" + IDENT (+ "lit" ... ) -> "lit"
  updated = updated.replace(
    /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
    (m) => {
      const first = /"[^"\n]*"/.exec(m);
      return first ? first[0] : m;
    },
  );
  return updated;
}

/**
 * Attempt to fix malformed JSON by handling common LLM response issues.
 * This function addresses various malformed JSON patterns that LLMs commonly produce.
 */
function quickRepairMalformedJson(jsonString: string): string {
  // No need to check if already valid - this function is only called when parsing already failed
  // Try progressive fixes for common issues
  let sanitized = jsonString;

  // Remove literal control characters that make JSON invalid at the top level
  // This must be done first before any other processing
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  // Fix literal newlines after backslashes in JSON structure
  // Pattern: \\\n -> \\n (backslash + literal newline to properly escaped newline)
  sanitized = sanitized.replace(/\\\n/g, "\\n");

  // Fix escaped Unicode control characters in JSON strings
  // Pattern: \\u0001 -> '' (remove escaped control characters)
  sanitized = sanitized.replace(/\\u000[1-9A-F]/g, "");
  sanitized = sanitized.replace(/\\u001[0-9A-F]/g, "");

  // Fix remaining null escape patterns in JSON strings
  // Pattern: '\\0' -> '' (remove null escape sequences in string literals)
  sanitized = sanitized.replace(/'\\0'/g, "''");

  // Concatenation normalization (extracted)
  sanitized = normalizeConcatenationChains(sanitized);

  // Handle over-escaped content within JSON string values
  // This is the most common issue with LLM responses containing SQL/code examples
  sanitized = repairOverEscapedStringSequences(sanitized);

  // Handle truncated JSON by attempting to close open structures
  sanitized = completeTruncatedJsonStructures(sanitized);

  return sanitized;
}

/**
 * Heuristically clean LLM JSON-like output by removing markdown fences, duplicated identical
 * objects, trailing commas, control characters, and extracting the largest balanced JSON span.
 * This is deliberately conservative and only used as a last-resort fallback.
 */
/**
 * LAST-RESORT resilient sanitation pipeline. Applied only after faster strategies fail.
 * @internal Use only via parseAndValidateLLMJsonContent
 */
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
    // duplicate object collapse (inline sanitizer)
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
    // final trim
    (input) => {
      const trimmed = input.trim();
      if (trimmed !== input) {
        return { content: trimmed, changed: true, description: "Trimmed whitespace" };
      }
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

/**
 * Safety check: detect if sanitized content contains two different concatenated JSON objects.
 * If both objects exist and differ, throw an error to avoid ambiguous parsing.
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
 * @internal Test-only wrapper to exercise safety detection logic directly without relying on
 * sanitation side-effects that normally remove the second object. Not part of the public API.
 */
export function __testEnsureNoDistinctConcatenatedObjects(
  sanitizedTrimmed: string,
  originalTrimmed: string,
  resourceName: string,
): void {
  ensureNoDistinctConcatenatedObjects(sanitizedTrimmed, originalTrimmed, resourceName);
}

/**
 * Type guard to validate that a value conforms to the LLMGeneratedContent type.
 */
function isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  return false;
}

/**
 * Full concatenation normalization used inside the heavier sanitization pipeline.
 * Applies broader merging & cleanup than the pre-pass.
 */
function normalizeConcatenationChains(input: string): string {
  if (!input.includes("+") || !input.includes('"')) return input;
  const simpleChain = SIMPLE_CHAIN_SEGMENT_REGEX;
  let updated = input;
  // Identifier-only chains -> empty string
  updated = updated.replace(IDENT_ONLY_CHAIN_REGEX, (_m, pfx) => `${pfx}""`);
  // Identifier-only chains at end of object or before newline
  updated = updated.replace(
    /(:\s*)([A-Za-z_][A-Za-z0-9_.()]*\s*(?:\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+)(?=\s*[}\n])/g,
    (_m, pfx) => `${pfx}""`,
  );
  // Identifier-leading chains ending with literal -> keep literal
  updated = updated.replace(IDENT_LEADING_WITH_LITERAL_REGEX, (_m, pfx, lit) => `${pfx}"${lit}"`);
  // Trim after first literal if identifiers appear later
  updated = updated.replace(
    FIRST_LITERAL_WITH_TAIL_REGEX,
    (m: string, pfx: string, lit: string, tail: string) => {
      if (!tail || typeof tail !== "string" || !tail.includes("+")) {
        return m;
      }
      if (/[+]\s*[A-Za-z_][A-Za-z0-9_.()]*/.test(tail)) {
        return `${pfx}"${lit}"`;
      }
      return m;
    },
  );
  let guard = 0;

  while (simpleChain.test(updated) && guard < 80) {
    guard += 1;
    // Identifier-leading simple chains
    updated = updated.replace(
      /(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"([^"\n]*)"/g,
      (_m, pfx, lit) => `${pfx}"${lit}"`,
    );
    // Identifier-leading chains inside normalization (same simple collapse)
    updated = updated.replace(/(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"[^"\n]*"/g, (full, pfx) => {
      const reLit = /"[^"\n]*"/;
      const lit = reLit.exec(full);
      return lit ? `${pfx}${lit[0]}` : full;
    });
    // Collapse chains with multiple literals before an identifier
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,20}\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Collapse simple literal + identifier (+ trailing literals) sequences
    updated = updated.replace(
      /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Literal + identifier (+ literals) collapse within key context
    updated = updated.replace(
      /(:\s*)"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (full, pfx) => {
        const lit = /"[^"\n]*"/.exec(full);
        return lit ? `${pfx}${lit[0]}` : full;
      },
    );
    // Additional collapse for mixed chains where identifier appears after intermediate literals
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*")+\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const firstLit = reFirst.exec(match);
        return firstLit ? firstLit[0] : match;
      },
    );
    // Merge pure literal chains (allow slightly longer)
    updated = updated.replace(/"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,10}(?=\s*[,}\]])/g, (chain) => {
      const tokens = chain
        .split(/\s*\+\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.length) return chain;
      const merged = tokens
        .map((t) => {
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.substring(1, t.length - 1);
          }
          return t;
        })
        .join("");
      return `"${merged}"`;
    });
  }

  // Final cleanup: chains with identifier anywhere collapse to first literal
  updated = updated.replace(
    /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
    (m) => {
      const first = /"[^"\n]*"/.exec(m);
      return first ? first[0] : m;
    },
  );
  return updated;
}

/**
 * Fix over-escaped sequences within a JSON string content.
 * This handles the actual content between quotes, not the JSON structure.
 */
function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;

  // Apply the exact same patterns that work in the manual test, in the same order
  // Pattern: \\\\\\\' -> ' (5 backslashes + single quote - most specific first)
  fixed = fixed.replace(/\\\\\\'/g, "'");

  // Pattern: \\\\\' -> ' (4 backslashes + single quote)
  fixed = fixed.replace(/\\\\'/g, "'");

  // Pattern: \\\' -> ' (3 backslashes + single quote)
  fixed = fixed.replace(/\\'/g, "'");

  // Pattern: \\\\\\\'.\\\\\\' -> '.' (5-backslash dot pattern)
  fixed = fixed.replace(/\\\\\\'\\./g, "'.");

  // Pattern: \\\\\\'\\\\\\\' -> '' (5-backslash empty quotes)
  // eslint-disable-next-line no-useless-escape
  fixed = fixed.replace(/\\\\\\'\\\\\\\'/g, "''");

  // Pattern: \\\'.\\' -> '.' (3-backslash dot pattern)
  fixed = fixed.replace(/\\'\\./g, "'.");

  // Pattern: \\\'\\' -> '' (3-backslash empty quotes)
  // eslint-disable-next-line no-useless-escape
  fixed = fixed.replace(/\\'\\\'/g, "''");

  // Fix over-escaped null characters (handle both 4 and 5 backslash patterns)
  // Pattern: \\\\\\0 -> \\0 (reduce 5-backslash null to proper null escape)
  fixed = fixed.replace(/\\\\\\0/g, "\\0");

  // Pattern: \\\\0 -> \\0 (reduce 4-backslash null to proper null escape)
  fixed = fixed.replace(/\\\\0/g, "\\0");

  // Clean up orphaned backslashes
  fixed = fixed.replace(/\\\\\s*,/g, ","); // Double backslash before comma
  fixed = fixed.replace(/\\\\\s*\)/g, ")"); // Double backslash before paren
  fixed = fixed.replace(/\\,/g, ","); // Single backslash before comma
  fixed = fixed.replace(/\\\)/g, ")"); // Single backslash before paren

  return fixed;
}

/**
 * Attempt to complete truncated JSON structures.
 */
function completeTruncatedJsonStructures(jsonString: string): string {
  const trimmed = jsonString.trim();
  if (trimmed && !trimmed.endsWith("}") && !trimmed.endsWith("]")) {
    // Count open vs closed braces and track if we're inside a string
    let braceDepth = 0;
    let bracketDepth = 0;
    let inString = false;
    let escapeNext = false;

    for (const [, char] of Array.from(trimmed).entries()) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") braceDepth++;
        else if (char === "}") braceDepth--;
        else if (char === "[") bracketDepth++;
        else if (char === "]") bracketDepth--;
      }
    }

    let sanitized = trimmed;

    // If we're still inside a string at the end, close it appropriately
    if (inString) {
      // Check if this looks like a truncated SQL CREATE TABLE statement
      const lastPart = sanitized.substring(Math.max(0, sanitized.length - 200));
      if (
        (lastPart.includes("TABLE IF NOT EXISTS") || lastPart.includes("CREATE TABLE")) &&
        (lastPart.includes("DEFAULT ") ||
          lastPart.includes("tinyint") ||
          lastPart.includes("BIGINT"))
      ) {
        // This looks like a truncated CREATE TABLE statement - close string cleanly
        const trimmedEnd = sanitized.trim();
        if (trimmedEnd.endsWith(",")) {
          // Remove trailing comma and close string properly
          const lastCommaIndex = sanitized.lastIndexOf(",");
          if (lastCommaIndex !== -1) {
            sanitized = sanitized.substring(0, lastCommaIndex) + '"';
          } else {
            sanitized += '"';
          }
        } else {
          // Just close the string
          sanitized += '"';
        }
      } else {
        // Generic string completion
        sanitized += '"';
      }
    }

    // Close open structures in the correct order
    // For JSON with nested objects in arrays, we need to close objects before arrays

    // If we have both braces and brackets, close them in nested order
    if (braceDepth > 0 && bracketDepth > 0) {
      // Close one object (table object), then array, then remaining objects
      sanitized += "}";
      braceDepth--;

      while (bracketDepth > 0) {
        sanitized += "]";
        bracketDepth--;
      }

      while (braceDepth > 0) {
        sanitized += "}";
        braceDepth--;
      }
    } else {
      // Standard closing
      while (bracketDepth > 0) {
        sanitized += "]";
        bracketDepth--;
      }
      while (braceDepth > 0) {
        sanitized += "}";
        braceDepth--;
      }
    }

    return sanitized;
  }

  return jsonString;
}
