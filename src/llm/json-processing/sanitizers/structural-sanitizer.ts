import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { CODE_FENCE_MARKERS } from "../constants/json-processing.config";
import { CODE_FENCE_REGEXES } from "../constants/regex.constants";
import { logOneLineWarning } from "../../../common/utils/logging";

/**
 * Consolidated structural sanitizer that handles high-level structural issues and noise.
 *
 * This sanitizer combines the functionality of multiple noise removal sanitizers:
 * 1. trimWhitespace: Remove leading/trailing whitespace
 * 2. removeCodeFences: Strip markdown code fences (```json)
 * 3. removeInvalidPrefixes: Remove invalid prefixes and stray text
 * 4. removeTruncationMarkers: Remove truncation markers (e.g., ...)
 * 5. extractLargestJsonSpan: Isolate the main JSON structure from surrounding text
 * 6. collapseDuplicateJsonObject: Fix cases where LLMs repeat the entire JSON object
 *
 * ## Purpose
 * LLMs often include noise, formatting artifacts, and structural issues in their JSON responses.
 * This sanitizer removes these issues in a logical order before more detailed syntax fixes.
 *
 * ## Implementation Order
 * The sanitizers are applied in this order for optimal results:
 * 1. Trim whitespace (removes leading/trailing noise)
 * 2. Remove code fences (removes markdown formatting)
 * 3. Remove invalid prefixes (removes introductory text)
 * 4. Extract largest JSON span (isolates JSON from surrounding text)
 * 5. Collapse duplicate objects (fixes repeated content)
 * 6. Remove truncation markers (removes truncation indicators)
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

    // Step 1: Trim whitespace
    const trimmed = sanitized.trim();
    if (trimmed !== sanitized) {
      sanitized = trimmed;
      hasChanges = true;
      diagnostics.push("Trimmed leading/trailing whitespace");
    }

    // Step 2: Remove code fences
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

    // Step 3: Remove invalid prefixes (introductory text, stray prefixes, etc.)
    const beforePrefixes = sanitized;
    sanitized = removeInvalidPrefixesInternal(sanitized, diagnostics);
    if (sanitized !== beforePrefixes) {
      hasChanges = true;
    }

    // Step 4: Extract largest JSON span
    const beforeExtract = sanitized;
    sanitized = extractLargestJsonSpanInternal(sanitized);
    if (sanitized !== beforeExtract) {
      hasChanges = true;
      diagnostics.push("Extracted largest JSON span from surrounding text");
    }

    // Step 5: Collapse duplicate JSON objects
    const beforeCollapse = sanitized;
    sanitized = collapseDuplicateJsonObjectInternal(sanitized);
    if (sanitized !== beforeCollapse) {
      hasChanges = true;
      diagnostics.push("Collapsed duplicate JSON object");
    }

    // Step 6: Remove truncation markers
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
 * Inlined from remove-invalid-prefixes.ts
 */
function removeInvalidPrefixesInternal(jsonString: string, diagnostics: string[]): string {
  let sanitized = jsonString;

  function isInStringAt(position: number, content: string): boolean {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < position; i++) {
      const char = content[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
      }
    }
    return inString;
  }

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
  sanitized = sanitized.replace(genericPrefixPattern, (match, prefix, word, offset: unknown) => {
    const numericOffset = typeof offset === "number" ? offset : 0;
    const wordStr = typeof word === "string" ? word : "";

    if (isInStringAt(numericOffset, sanitized)) {
      return match;
    }

    const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
    const isAfterValidDelimiter = /[}\],]\s*$/.test(beforeMatch) || numericOffset < 100;

    if (isAfterValidDelimiter && wordStr.length > 3) {
      const lowerWord = wordStr.toLowerCase();
      const commonIntroWords = new Set([
        "here",
        "this",
        "that",
        "the",
        "a",
        "an",
        "command",
        "data",
        "result",
        "output",
        "json",
        "response",
        "object",
        "content",
        "payload",
        "body",
        "answer",
      ]);
      if (!commonIntroWords.has(lowerWord)) {
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
    (match, delimiter, whitespace, strayText, propertyName, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
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

  return sanitized;
}

/**
 * Internal helper to extract the largest JSON span.
 * Extracted from extract-largest-json-span.ts for reuse.
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

      if (sliced === trimmedInput || (sliced.length > trimmedInput.length * 0.95 && start < 10)) {
        continue;
      }

      if (
        (sliced.startsWith("{") && sliced.endsWith("}")) ||
        (sliced.startsWith("[") && sliced.endsWith("]"))
      ) {
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
 * Extracted from collapse-duplicate-json-object.ts for reuse.
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
 * Inlined from remove-truncation-markers.ts
 */
function removeTruncationMarkersInternal(jsonString: string, diagnostics: string[]): string {
  let sanitized = jsonString;

  function isInStringAt(position: number, content: string): boolean {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < position; i++) {
      const char = content[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
      }
    }
    return inString;
  }

  // Pattern 1: Remove standalone truncation marker lines
  const truncationMarkerPattern =
    /(,\s*)?\n(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\)|\.\.\.\s*\(truncated\)|truncated|\.\.\.\s*truncated)(\s*)\n/g;

  sanitized = sanitized.replace(
    truncationMarkerPattern,
    (match, optionalComma, _whitespaceBefore, marker, _whitespaceAfter, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
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
    (_match, stringContent, _marker, _whitespace1, whitespace2, delimiter, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
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
      offset: unknown,
    ) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
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
    (match, before, _whitespace, marker, _whitespace2, after, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
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

  return sanitized;
}
