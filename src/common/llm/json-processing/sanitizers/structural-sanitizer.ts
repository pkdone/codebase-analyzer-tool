import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import {
  CODE_FENCE_MARKERS,
  COMMON_INTRO_WORDS,
  parsingHeuristics,
} from "../constants/json-processing.config";
import { CODE_FENCE_REGEXES } from "../constants/regex.constants";
import { logOneLineWarning } from "../../../utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";

/**
 * Consolidated structural sanitizer that handles high-level structural issues and noise.
 *
 * This sanitizer combines the functionality of multiple noise removal sanitizers:
 * - trimWhitespace: Remove leading/trailing whitespace
 * - removeCodeFences: Strip markdown code fences (```json)
 * - removeInvalidPrefixes: Remove invalid prefixes and stray text
 * - fixUnclosedArrays: Fix arrays missing closing brackets before sibling properties
 * - extractLargestJsonSpan: Isolate the main JSON structure from surrounding text
 * - collapseDuplicateJsonObject: Fix cases where LLMs repeat the entire JSON object
 * - removeTruncationMarkers: Remove truncation markers (e.g., ...)
 *
 * ## Purpose
 * LLMs often include noise, formatting artifacts, and structural issues in their JSON responses.
 * This sanitizer removes these issues in a logical order before more detailed syntax fixes.
 *
 * ## Implementation Order
 * The sanitizers are applied in this order for optimal results:
 * - Trim whitespace (removes leading/trailing noise)
 * - Remove code fences (removes markdown formatting)
 * - Remove invalid prefixes (removes introductory text)
 * - Fix unclosed arrays (must run before delimiter mismatch detection)
 * - Extract largest JSON span (isolates JSON from surrounding text)
 * - Collapse duplicate objects (fixes repeated content)
 * - Remove truncation markers (removes truncation indicators)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with structural fixes applied
 */
export const fixJsonStructureAndNoise: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Trim whitespace
    const trimmed = sanitized.trim();
    if (trimmed !== sanitized) {
      sanitized = trimmed;
      hasChanges = true;
      diagnostics.push("Trimmed leading/trailing whitespace");
    }

    // Remove code fences
    if (sanitized.includes(CODE_FENCE_MARKERS.GENERIC)) {
      const beforeFences = sanitized;
      for (const regex of CODE_FENCE_REGEXES) {
        sanitized = sanitized.replaceAll(regex, "");
      }
      if (sanitized !== beforeFences) {
        hasChanges = true;
        diagnostics.push("Removed markdown code fences");
      }
    }

    // Remove invalid prefixes (introductory text, stray prefixes, etc.)
    const beforePrefixes = sanitized;
    sanitized = removeInvalidPrefixesInternal(sanitized, diagnostics);
    if (sanitized !== beforePrefixes) {
      hasChanges = true;
    }

    // Fix unclosed arrays before property names
    // This MUST run before delimiter mismatch detection (in fixJsonSyntax)
    // to prevent incorrect delimiter corrections that corrupt the structure
    const beforeUnclosedArrays = sanitized;
    sanitized = fixUnclosedArraysBeforePropertiesInternal(sanitized, diagnostics);
    if (sanitized !== beforeUnclosedArrays) {
      hasChanges = true;
    }

    // Extract largest JSON span
    const beforeExtract = sanitized;
    sanitized = extractLargestJsonSpanInternal(sanitized);
    if (sanitized !== beforeExtract) {
      hasChanges = true;
      diagnostics.push("Extracted largest JSON span from surrounding text");
    }

    // Collapse duplicate JSON objects
    const beforeCollapse = sanitized;
    sanitized = collapseDuplicateJsonObjectInternal(sanitized);
    if (sanitized !== beforeCollapse) {
      hasChanges = true;
      diagnostics.push("Collapsed duplicate JSON object");
    }

    // Remove truncation markers
    const beforeTruncation = sanitized;
    sanitized = removeTruncationMarkersInternal(sanitized, diagnostics);
    if (sanitized !== beforeTruncation) {
      hasChanges = true;
    }

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed JSON structure and noise",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    logOneLineWarning(`fixJsonStructureAndNoise sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

/**
 * Internal helper to remove invalid prefixes and stray text.
 */
function removeInvalidPrefixesInternal(jsonString: string, diagnostics: string[]): string {
  let sanitized = jsonString;

  // Pattern 1: Remove thought markers
  const ctrlThoughtPattern = /<ctrl\d+>\s*thought\s*\n/i;
  sanitized = sanitized.replace(ctrlThoughtPattern, () => {
    if (diagnostics.length < 10) {
      diagnostics.push("Removed control-style thought marker");
    }
    return "";
  });

  const thoughtMarkerPattern = /^thought\s*:?\s*\n/i;
  sanitized = sanitized.replace(thoughtMarkerPattern, () => {
    if (diagnostics.length < 10) {
      diagnostics.push("Removed thought marker");
    }
    return "";
  });

  // Pattern 2: Remove introductory text before opening braces
  const genericPrefixPattern = /(^|\n|\r)\s*([a-zA-Z_]{2,20})\s*[:]?\s*\{/g;
  sanitized = sanitized.replace(genericPrefixPattern, (match, prefix, word, offset: number) => {
    const wordStr = typeof word === "string" ? word : "";

    if (isInStringAt(offset, sanitized)) {
      return match;
    }

    const beforeMatch = sanitized.substring(Math.max(0, offset - 50), offset);
    const isAfterValidDelimiter =
      /[}\],]\s*$/.test(beforeMatch) || offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT;

    if (isAfterValidDelimiter && wordStr.length > 3) {
      const lowerWord = wordStr.toLowerCase();
      if (!COMMON_INTRO_WORDS.has(lowerWord)) {
        return match;
      }
    }

    if (diagnostics.length < 10) {
      diagnostics.push(`Removed introductory text "${wordStr}" before opening brace`);
    }
    return `${prefix}{`;
  });

  // Pattern 3: Remove stray text before property names (simplified - handles common cases)
  const strayTextPattern =
    /([}\],]|\n|^)(\s*)([\w\u0080-\uFFFF$]{1,})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
  sanitized = sanitized.replace(
    strayTextPattern,
    (match, delimiter, whitespace, strayText, propertyName, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const strayTextStr = typeof strayText === "string" ? strayText : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      const isValidDelimiter =
        delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);
      const jsonKeywords = ["true", "false", "null", "undefined"];
      const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

      if (isValidDelimiter && !isStrayTextValid) {
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Removed stray text "${strayTextStr}" before property "${propertyNameStr}"`,
          );
        }
        return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
      }

      return match;
    },
  );

  // Pattern 4: Fix missing opening brace for array elements
  // Pattern: `},\n    _family_details":` -> `},\n    {"family_details":`
  // This handles cases where array elements are missing the opening brace and the property name
  // has a leading underscore or other character instead of a quote
  const missingOpeningBracePattern = /(}\s*,\s*\n\s*)([_])([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
  sanitized = sanitized.replace(
    missingOpeningBracePattern,
    (match, prefix, strayChar, propertyName, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const prefixStr = typeof prefix === "string" ? prefix : "";
      const strayCharStr = typeof strayChar === "string" ? strayChar : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      // Check if this looks like a missing opening brace situation
      // The pattern is: close object }, newline, possibly a stray char, then property name with missing leading quote
      // We need to verify we're in an array context by looking at the broader context
      const beforeMatch = sanitized.substring(
        Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        offset,
      );
      // A simpler check: look for an opening bracket without matching closer before the match
      const hasOpenArray =
        beforeMatch.includes("[") && beforeMatch.lastIndexOf("[") > beforeMatch.lastIndexOf("]");

      if (hasOpenArray && strayCharStr !== "") {
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed missing opening brace and quote before property "${propertyNameStr}"`,
          );
        }
        return `${prefixStr}{"${propertyNameStr}":`;
      }

      return match;
    },
  );

  // Pattern 5: Fix missing opening brace when property name has no leading quote at all
  // Pattern: `},\n    propertyName":` -> `},\n    {"propertyName":`
  const missingBraceAndQuotePattern = /(}\s*,\s*\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
  sanitized = sanitized.replace(
    missingBraceAndQuotePattern,
    (match, prefix, propertyName, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const prefixStr = typeof prefix === "string" ? prefix : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      // Verify we're in an array context
      const beforeMatch = sanitized.substring(
        Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        offset,
      );
      // A simpler check: look for an opening bracket without matching closer before the match
      const hasOpenArray =
        beforeMatch.includes("[") && beforeMatch.lastIndexOf("[") > beforeMatch.lastIndexOf("]");

      if (hasOpenArray) {
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed missing opening brace and quote before property "${propertyNameStr}"`,
          );
        }
        return `${prefixStr}{"${propertyNameStr}":`;
      }

      return match;
    },
  );

  return sanitized;
}

/**
 * Internal helper to fix unclosed arrays before property names.
 * This pattern occurs when the LLM forgets to close an array with `]` before
 * the next sibling property.
 *
 * Pattern: `},\n  "propertyName":` when inside an array that's not closed
 * Should be: `}],\n  "propertyName":`
 *
 * This must run BEFORE delimiter mismatch detection, as that would otherwise
 * corrupt the structure by incorrectly "fixing" the delimiters.
 */
function fixUnclosedArraysBeforePropertiesInternal(
  jsonString: string,
  diagnostics: string[],
): string {
  let sanitized = jsonString;

  // Pattern: closing brace, comma, newline + whitespace, then a property name with colon
  // This indicates an unclosed array if we're inside an array context
  const unclosedArrayPattern = /(\})\s*,\s*\n(\s*)("[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g;

  sanitized = sanitized.replace(
    unclosedArrayPattern,
    (match, closingBrace, whitespace, propertyName, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      // Check if we're in an array context by scanning backwards
      const beforeMatch = sanitized.substring(
        Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        offset,
      );

      let bracketDepth = 0;
      let inString = false;
      let escape = false;
      let foundUnclosedArray = false;

      for (let i = beforeMatch.length - 1; i >= 0; i--) {
        const char = beforeMatch[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === "]") {
            bracketDepth++;
          } else if (char === "[") {
            bracketDepth--;
            if (bracketDepth < 0) {
              // Found an unclosed array
              foundUnclosedArray = true;
              break;
            }
          }
        }
      }

      if (!foundUnclosedArray) {
        return match;
      }

      if (diagnostics.length < 10) {
        diagnostics.push("Fixed unclosed array before property name");
      }

      return `${closingBraceStr}],\n${whitespaceStr}${propertyNameStr}`;
    },
  );

  return sanitized;
}

/**
 * Internal helper to extract the largest JSON span.
 */
function extractLargestJsonSpanInternal(input: string): string {
  // Find all potential JSON starts (both { and [)
  const candidates: { position: number; char: string }[] = [];
  let searchPos = 0;
  while (searchPos < input.length) {
    const bracePos = input.indexOf("{", searchPos);
    const bracketPos = input.indexOf("[", searchPos);

    if (bracePos !== -1) {
      candidates.push({ position: bracePos, char: "{" });
    }
    if (bracketPos !== -1) {
      candidates.push({ position: bracketPos, char: "[" });
    }

    if (bracePos === -1 && bracketPos === -1) break;
    const minPos = Math.min(
      bracePos === -1 ? Infinity : bracePos,
      bracketPos === -1 ? Infinity : bracketPos,
    );
    searchPos = minPos + 1;
  }

  candidates.sort((a, b) => a.position - b.position);

  const trimmedInput = input.trim();
  const trimmedStart = input.indexOf(trimmedInput);
  let firstCandidate: { position: number; char: string } | null = null;
  for (const candidate of candidates) {
    if (candidate.position === trimmedStart || (candidate.position < 10 && trimmedStart === 0)) {
      firstCandidate = candidate;
      break;
    }
  }

  const candidatesToTry = firstCandidate
    ? [firstCandidate, ...candidates.filter((c) => c !== firstCandidate)]
    : candidates;

  for (const candidate of candidatesToTry) {
    const { position: start, char: startChar } = candidate;

    // Validate that this looks like a valid JSON start
    if (start + 1 >= input.length) continue;
    const nextChar = input[start + 1];
    if (startChar === "{" && !["\n", "\r", " ", "\t", '"', "}", "a", "A"].includes(nextChar)) {
      continue;
    }
    if (
      startChar === "[" &&
      !["\n", "\r", " ", "\t", "]", '"', "{", "[", "0", "-"].includes(nextChar)
    ) {
      continue;
    }

    const endChar = startChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = start; i < input.length; i++) {
      const ch = input[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === startChar) depth++;
        else if (ch === endChar) {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    const isFirstCandidate = firstCandidate && candidate === firstCandidate;

    if (endIndex !== -1) {
      const sliced = input.slice(start, endIndex + 1).trim();
      const trimmedInput = input.trim();

      // Check if sliced is exactly the same as trimmed input - no extraction needed
      if (sliced === trimmedInput) {
        continue;
      }

      // Check if the extracted span is a complete, balanced JSON structure
      const isCompleteJsonStructure =
        (sliced.startsWith("{") && sliced.endsWith("}")) ||
        (sliced.startsWith("[") && sliced.endsWith("]"));

      if (isCompleteJsonStructure) {
        // Check if there's trailing garbage after the valid JSON
        // (extra closing delimiters, text, etc.)
        // We check what comes after endIndex in the original input
        const afterValidJson = input.slice(endIndex + 1).trim();
        const hasTrailingGarbage = afterValidJson.length > 0;

        // If we have trailing garbage (like extra `}` or `]`), extract the valid JSON
        // But only if this is the FIRST candidate (outermost structure)
        // We must NOT extract nested objects - always prefer outer structure
        if (hasTrailingGarbage && isFirstCandidate) {
          return sliced;
        }

        // For very similar lengths without trailing garbage, skip extraction
        // unless there's a meaningful difference (not just whitespace)
        if (sliced.length > trimmedInput.length * 0.95 && start < 10) {
          continue;
        }

        if (isFirstCandidate) {
          // If first candidate is complete, return it immediately
          return sliced;
        }
        // If this is not the first candidate, we found a nested complete object.
        // If firstCandidate exists and is at the start (within first 10 chars),
        // prefer the outer structure by returning input unchanged.
        // This ensures we don't extract nested objects when the outer structure is available.
        if (firstCandidate && firstCandidate.position < 10) {
          // Prefer the outer structure - return input unchanged
          return input;
        }
        // Otherwise, return the nested complete object
        return sliced;
      }
    } else {
      // No matching closing delimiter found
      if (isFirstCandidate) {
        // If the first candidate (outer structure) can't be completed,
        // return input unchanged so completion sanitizer can fix it
        return input;
      }
    }
  }

  return input;
}

/**
 * Internal helper to collapse duplicate JSON objects.
 */
function collapseDuplicateJsonObjectInternal(input: string): string {
  const dupPattern = /^(\{[\s\S]+\})\s*\1\s*$/;
  if (dupPattern.test(input)) {
    return input.replace(dupPattern, "$1");
  }
  return input;
}

/**
 * Internal helper to remove truncation markers.
 */
function removeTruncationMarkersInternal(jsonString: string, diagnostics: string[]): string {
  let sanitized = jsonString;

  // Pattern 1: Remove standalone truncation marker lines
  const truncationMarkerPattern =
    /(,\s*)?\n(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\)|\.\.\.\s*\(truncated\)|truncated|\.\.\.\s*truncated)(\s*)\n/g;

  sanitized = sanitized.replace(
    truncationMarkerPattern,
    (match, optionalComma, _whitespaceBefore, marker, _whitespaceAfter, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const markerStr = typeof marker === "string" ? marker : "";
      const hasTrailingComma = optionalComma !== undefined && optionalComma !== null;

      if (diagnostics.length < 10) {
        diagnostics.push(`Removed truncation marker: "${markerStr.trim()}"`);
      }

      if (hasTrailingComma) {
        return ",\n\n";
      }
      return "\n\n";
    },
  );

  // Pattern 2: Handle incomplete strings before closing delimiters
  const incompleteStringPattern = /"([^"]*?)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;
  sanitized = sanitized.replace(
    incompleteStringPattern,
    (_match, stringContent, _marker, _whitespace1, whitespace2, delimiter, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return _match;
      }

      const contentStr = typeof stringContent === "string" ? stringContent : "";
      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      const ws2 = typeof whitespace2 === "string" ? whitespace2 : "";

      if (diagnostics.length < 10) {
        diagnostics.push(
          `Fixed incomplete string before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );
      }

      return `"${contentStr}"${delimiterStr === "]" ? "," : ""}${ws2}${delimiterStr}`;
    },
  );

  // Pattern 3: Handle truncation markers right before closing delimiters
  const truncationBeforeDelimiterPattern =
    /("\s*,\s*|\n)(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;
  sanitized = sanitized.replace(
    truncationBeforeDelimiterPattern,
    (
      _match,
      beforeMarker,
      _whitespace1,
      _marker,
      _whitespace2,
      whitespace3,
      delimiter,
      offset: number,
    ) => {
      if (isInStringAt(offset, sanitized)) {
        return _match;
      }

      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      const ws3 = typeof whitespace3 === "string" ? whitespace3 : "";
      const beforeStr = typeof beforeMarker === "string" ? beforeMarker : "";

      if (diagnostics.length < 10) {
        diagnostics.push(
          `Removed truncation marker before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );
      }

      if (beforeStr.includes(",")) {
        return `${beforeStr}\n${ws3}${delimiterStr}`;
      }
      return `\n${ws3}${delimiterStr}`;
    },
  );

  // Pattern 4: Handle _TRUNCATED_ markers
  const underscoreTruncatedPattern =
    /([}\],]|\n|^)(\s*)(_TRUNCATED_|_INPUT_TOKEN_COUNT_|_DOC_GENERATION_TRUNCATED_)(\s*)([}\],]|\n|$)/gi;
  sanitized = sanitized.replace(
    underscoreTruncatedPattern,
    (match, before, _whitespace, marker, _whitespace2, after, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      if (diagnostics.length < 10) {
        const markerStr = typeof marker === "string" ? marker : "";
        diagnostics.push(`Removed truncation marker: ${markerStr}`);
      }

      const beforeStr = typeof before === "string" ? before : "";
      const afterStr = typeof after === "string" ? after : "";

      if (beforeStr.includes(",")) {
        return `${beforeStr}\n${afterStr}`;
      }
      return `${beforeStr}${afterStr}`;
    },
  );

  // Pattern 5: Remove LLM instruction text appended after truncation
  // Pattern: JSON content followed by LLM instructions like "Please provide the code..." or "Here is the JSON..."
  // These appear when the LLM adds instructions/commentary after the JSON output
  const llmInstructionAfterJsonPattern =
    /([}\]])\s*\n\s*(Please\s+(?:provide|note|ensure|make|check|review)|Here\s+(?:is|are)|Note\s*:|The\s+(?:JSON|response|output|above)|This\s+(?:JSON|response|output)|I\s+(?:have|will|shall)|Make\s+sure|Ensure\s+that|Remember\s+to)[^{}[\]]*$/gi;
  sanitized = sanitized.replace(
    llmInstructionAfterJsonPattern,
    (match, delimiter, _instruction, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const delimiterStr = typeof delimiter === "string" ? delimiter : "";

      if (diagnostics.length < 10) {
        diagnostics.push("Removed LLM instruction text appended after JSON");
      }

      return delimiterStr;
    },
  );

  // Pattern 6: Remove schema definitions or extra JSON after the main structure
  // Pattern: Complete JSON followed by schema definitions like `{\n  "$schema":` or `{\n  "type":`
  const extraJsonAfterMainPattern =
    /([}\]])\s*\n\s*\{\s*"\$schema"\s*:|([}\]])\s*\n\s*\{\s*"type"\s*:\s*"(?:object|array|string|number)"/g;
  sanitized = sanitized.replace(
    extraJsonAfterMainPattern,
    (match, delimiter1, delimiter2, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const delimiter1Str = typeof delimiter1 === "string" ? delimiter1 : "";
      const delimiter2Str = typeof delimiter2 === "string" ? delimiter2 : "";
      const delimiterStr = delimiter1Str !== "" ? delimiter1Str : delimiter2Str;
      if (delimiterStr !== "") {
        if (diagnostics.length < 10) {
          diagnostics.push("Removed extra JSON/schema after main structure");
        }
        return delimiterStr;
      }

      return match;
    },
  );

  return sanitized;
}
