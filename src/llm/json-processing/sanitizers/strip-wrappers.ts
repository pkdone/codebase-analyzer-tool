import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../constants/sanitization-steps.config";
import { CODE_FENCE_REGEXES } from "../constants/regex.constants";

/**
 * Validates if a position in the string is likely the start of a JSON object/array.
 * Checks that the opening delimiter is followed by valid JSON content (whitespace, quote, or bracket).
 */
function isValidJsonStart(position: number, delimiter: string, content: string): boolean {
  if (position < 0 || position >= content.length) return false;

  // Check if it's a code snippet (like "else{" or "if {") by looking before
  // We only reject if there's a word character immediately before { (no space/newline)
  // This distinguishes code snippets from valid JSON with explanatory text before it
  if (delimiter === "{" && position > 0) {
    const charBefore = content[position - 1];
    // If there's a word character or underscore immediately before { (no space), it's likely code
    if (/[a-zA-Z_$]/.test(charBefore)) {
      return false; // Likely code snippet like "else{" or "if{"
    }
  }

  // Check what comes immediately after the delimiter (don't trim - check raw chars)
  if (position + 1 >= content.length) return false;

  // For objects, valid starts are: whitespace, newline, quote, closing brace (empty object),
  // or a letter (for unquoted property names that will be fixed by later sanitizers)
  if (delimiter === "{") {
    const nextChar = content[position + 1];
    // Valid: whitespace, newline, quote (for property name), } (empty object),
    // or a letter (for unquoted property names - these will be fixed by fixUnquotedPropertyNames)
    if (
      nextChar === "\n" ||
      nextChar === "\r" ||
      nextChar === " " ||
      nextChar === "\t" ||
      nextChar === '"' ||
      nextChar === "}" ||
      (nextChar >= "a" && nextChar <= "z") ||
      (nextChar >= "A" && nextChar <= "Z")
    ) {
      return true;
    }
    return false; // Doesn't look like JSON
  }

  // For arrays, valid starts are: whitespace, newline, or closing bracket (empty array), or valid JSON values
  if (delimiter === "[") {
    const nextChar = content[position + 1];
    return (
      nextChar === "\n" ||
      nextChar === "\r" ||
      nextChar === " " ||
      nextChar === "\t" ||
      nextChar === "]" ||
      nextChar === '"' ||
      nextChar === "{" ||
      nextChar === "[" ||
      (nextChar >= "0" && nextChar <= "9") || // numbers
      nextChar === "-" // negative numbers
    );
  }

  return false;
}

/**
 * Consolidated sanitizer that removes all non-JSON "noise" surrounding the core JSON payload.
 *
 * This sanitizer combines the functionality of:
 * 1. trim-whitespace: Remove leading/trailing whitespace
 * 2. remove-code-fences: Strip markdown code fences (```json)
 * 3. extract-largest-json-span: Extract main JSON structure from surrounding text
 * 4. remove-invalid-prefixes: Remove invalid prefixes and stray text
 * 5. collapse-duplicate-json-object: Fix duplicated identical JSON objects
 *
 * ## Purpose
 * LLMs often include explanatory text, code fences, and formatting around the actual JSON content.
 * This sanitizer removes all that noise to isolate the core JSON structure.
 *
 * ## Implementation Order
 * 1. Remove code fences (must be first to expose JSON structure)
 * 2. Trim whitespace
 * 3. Collapse duplicate objects (before extraction to avoid false matches)
 * 4. Extract largest JSON span (finds the main JSON structure)
 * 5. Remove common prefixes (final cleanup of any remaining text)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with wrappers stripped and JSON extracted
 */
export const stripWrappers: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Step 1: Remove code fences
    if (sanitized.includes("```")) {
      const beforeFences = sanitized;
      for (const regex of CODE_FENCE_REGEXES) {
        sanitized = sanitized.replaceAll(regex, "");
      }
      if (sanitized !== beforeFences) {
        hasChanges = true;
        diagnostics.push("Removed code fences");
      }
    }

    // Step 2: Trim whitespace
    const trimmed = sanitized.trim();
    if (trimmed !== sanitized) {
      sanitized = trimmed;
      hasChanges = true;
      diagnostics.push("Trimmed whitespace");
    }

    // Step 2b: Remove thought markers (before extraction so they're tracked)
    const ctrlThoughtPattern = /<ctrl\d+>\s*thought\s*\n/i;
    if (ctrlThoughtPattern.test(sanitized)) {
      sanitized = sanitized.replace(ctrlThoughtPattern, "");
      hasChanges = true;
      diagnostics.push("Removed thought markers");
    }

    const thoughtMarkerPattern = /^thought\s*:?\s*\n/i;
    const beforeThoughtRemoval = sanitized;
    sanitized = sanitized.replace(thoughtMarkerPattern, "");
    if (sanitized !== beforeThoughtRemoval) {
      hasChanges = true;
      diagnostics.push("Removed thought markers");
    }

    // Step 2c: Remove introductory text before opening braces (before extraction)
    const genericPrefixPatternEarly = /(^|\n|\r)\s*([a-zA-Z_][a-zA-Z_\s]{1,50}?)\s*[:]?\s*\{/g;
    const commonIntroWordsEarly = new Set([
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

    sanitized = sanitized.replace(
      genericPrefixPatternEarly,
      (match, prefix, phrase, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const phraseStr = typeof phrase === "string" ? phrase : "";
        const words = phraseStr.trim().toLowerCase().split(/\s+/);
        const firstWord = words[0] || "";

        // Helper to check if we're inside a string
        let inString = false;
        let escaped = false;
        for (let i = 0; i < numericOffset; i++) {
          const char = sanitized[i];
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

        if (inString) {
          return match;
        }

        // Only remove if it starts with a common intro word and is at the start or after newline
        if (!commonIntroWordsEarly.has(firstWord)) {
          return match;
        }

        // Don't remove if it looks like it might be a property name (after valid delimiter)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        const isAfterValidDelimiter = /[}\],]\s*$/.test(beforeMatch);
        if (isAfterValidDelimiter && numericOffset > 100) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(`Removed introductory text "${phraseStr.trim()}" before opening brace`);
        return `${prefix}{`;
      },
    );

    // Step 3: Collapse duplicate JSON objects
    // Pattern: exact same JSON object duplicated back-to-back
    const dupPattern = /^(\{[\s\S]+\})\s*\1\s*$/;
    if (dupPattern.test(sanitized)) {
      sanitized = sanitized.replace(dupPattern, "$1");
      hasChanges = true;
      diagnostics.push("Collapsed duplicated identical JSON object");
    }

    // Step 4a: Check for trailing text before extraction (so we can detect it)
    let hadTrailingText = false;
    let trailingTextContent = "";
    const trailingTextCheckPattern = /(\})\s+([a-z][^}]{10,})(\s*)$/im;
    const trailingTextCheck = trailingTextCheckPattern.exec(sanitized);
    if (trailingTextCheck?.index !== undefined) {
      const trimmedTrailing = trailingTextCheck[2].trim();
      const isExplanatoryText =
        !trimmedTrailing.includes('"') &&
        !trimmedTrailing.includes("{") &&
        !trimmedTrailing.includes("[") &&
        trimmedTrailing.length > 10 &&
        /^[a-z\s.,!?]+$/i.test(trimmedTrailing);
      if (isExplanatoryText) {
        hadTrailingText = true;
        trailingTextContent = trimmedTrailing;
      }
    }

    // Step 4: Extract largest JSON span
    // Find all potential JSON starts (both { and [)
    const candidates: { position: number; char: string }[] = [];
    let searchPos = 0;
    while (searchPos < sanitized.length) {
      const bracePos = sanitized.indexOf("{", searchPos);
      const bracketPos = sanitized.indexOf("[", searchPos);

      if (bracePos !== -1) {
        candidates.push({ position: bracePos, char: "{" });
      }
      if (bracketPos !== -1) {
        candidates.push({ position: bracketPos, char: "[" });
      }

      // Move search position forward
      if (bracePos === -1 && bracketPos === -1) break;
      const minPos = Math.min(
        bracePos === -1 ? Infinity : bracePos,
        bracketPos === -1 ? Infinity : bracketPos,
      );
      searchPos = minPos + 1;
    }

    // Sort by position
    candidates.sort((a, b) => a.position - b.position);

    // If the input starts with { or [ (after trimming), prioritize that candidate
    const trimmedInput = sanitized.trim();
    const trimmedStart = sanitized.indexOf(trimmedInput);
    let firstCandidate: { position: number; char: string } | null = null;
    for (const candidate of candidates) {
      if (candidate.position === trimmedStart || (candidate.position < 10 && trimmedStart === 0)) {
        firstCandidate = candidate;
        break;
      }
    }

    // Try candidates in order: first the one at the start (if any), then all others
    const candidatesToTry = firstCandidate
      ? [firstCandidate, ...candidates.filter((c) => c !== firstCandidate)]
      : candidates;

    let extractedSpan: string | null = null;
    for (const candidate of candidatesToTry) {
      const { position: start, char: startChar } = candidate;

      // Validate that this looks like a valid JSON start
      if (!isValidJsonStart(start, startChar, sanitized)) {
        continue; // Skip this candidate, try next
      }

      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let endIndex = -1;

      for (let i = start; i < sanitized.length; i++) {
        const ch = sanitized[i];
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

      if (endIndex !== -1) {
        const sliced = sanitized.slice(start, endIndex + 1).trim();
        const trimmedSanitized = sanitized.trim();

        // If the extracted content is the same as the trimmed input (or very close),
        // then the input is already clean JSON - don't change it
        if (
          sliced === trimmedSanitized ||
          (sliced.length > trimmedSanitized.length * 0.95 && start < 10)
        ) {
          extractedSpan = null; // No extraction needed
          break;
        }

        // Validate that the extracted span looks like valid JSON
        if (
          (sliced.startsWith("{") && sliced.endsWith("}")) ||
          (sliced.startsWith("[") && sliced.endsWith("]"))
        ) {
          extractedSpan = sliced;
          break;
        }
      } else {
        // No matching closing delimiter found - input might be truncated
        // If this candidate is at the start of the input, don't extract to let
        // later sanitizers (like fix-structural-errors) handle it
        const trimmedStart = sanitized.indexOf(sanitized.trim());
        if (start === trimmedStart || start < 10) {
          extractedSpan = null;
          break;
        }
      }
    }

    if (extractedSpan) {
      sanitized = extractedSpan;
      hasChanges = true;
      // Always log extraction, and also log trailing text removal if it occurred
      diagnostics.push("Extracted largest JSON span");
      if (hadTrailingText) {
        diagnostics.push(`Removed trailing text: "${trailingTextContent.substring(0, 30)}..."`);
      }
    } else if (hadTrailingText) {
      // If no extraction happened but we detected trailing text, remove it now
      const trailingTextPattern = /(\})\s+([a-z][^}]{10,})(\s*)$/im;
      const trailingTextMatch = trailingTextPattern.exec(sanitized);
      if (trailingTextMatch?.index !== undefined) {
        const matchIndex = trailingTextMatch.index;
        sanitized = sanitized.substring(0, matchIndex + 1);
        hasChanges = true;
        diagnostics.push(`Removed trailing text: "${trailingTextContent.substring(0, 30)}..."`);
      }
    }

    // Step 5: Remove common prefixes (final cleanup)
    // Remove generic introductory text before opening braces
    // Pattern: multi-word phrase optionally followed by colon, then whitespace, then opening brace
    const genericPrefixPattern = /(^|\n|\r)\s*([a-zA-Z_][a-zA-Z_\s]{1,50}?)\s*[:]?\s*\{/g;
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

    sanitized = sanitized.replace(
      genericPrefixPattern,
      (match, prefix, phrase, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const phraseStr = typeof phrase === "string" ? phrase : "";
        const words = phraseStr.trim().toLowerCase().split(/\s+/);
        const firstWord = words[0] || "";

        // Helper to check if we're inside a string
        let inString = false;
        let escaped = false;
        for (let i = 0; i < numericOffset; i++) {
          const char = sanitized[i];
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

        if (inString) {
          return match;
        }

        // Check if this looks like a valid JSON property name context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        const isAfterValidDelimiter = /[}\],]\s*$/.test(beforeMatch) || numericOffset < 100;

        // If it's after a valid delimiter, it might be a property name - be more conservative
        if (isAfterValidDelimiter && phraseStr.length > 3) {
          // Only remove if it starts with a common introductory word
          if (!commonIntroWords.has(firstWord)) {
            return match;
          }
        }

        // Check if the phrase starts with a common intro word (for multi-word phrases)
        if (words.length > 1 && !commonIntroWords.has(firstWord)) {
          // For multi-word phrases, be more lenient - if it contains common words, allow it
          const hasCommonWord = words.some((w) => commonIntroWords.has(w));
          if (!hasCommonWord && phraseStr.length > 10) {
            return match;
          }
        } else if (words.length === 1 && !commonIntroWords.has(firstWord) && phraseStr.length > 3) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(`Removed introductory text "${phraseStr.trim()}" before opening brace`);
        return `${prefix}{`;
      },
    );

    // Final trim after all processing
    const finalTrimmed = sanitized.trim();
    if (finalTrimmed !== sanitized) {
      sanitized = finalTrimmed;
      hasChanges = true;
    }

    // Step 6: Remove any trailing content after valid JSON closing brace
    // This handles cases where there's content after the JSON ends
    // Only remove content after the ROOT closing brace (the very last } in the JSON)
    // Pattern: closing brace at the end of the string, followed by whitespace and any content
    const trailingContentPattern = /(\})\s+([^\s}].*?)(\s*)$/s;
    const trailingContentMatch = trailingContentPattern.exec(sanitized);
    if (trailingContentMatch?.index !== undefined) {
      const trailingContent = trailingContentMatch[2] || "";
      // Only remove if it looks like explanatory text (not JSON structure)
      // Check if it doesn't start with {, [, ", ], or , (which would be more JSON)
      const trimmedTrailing = trailingContent.trim();
      if (
        !trimmedTrailing.startsWith("{") &&
        !trimmedTrailing.startsWith("[") &&
        !trimmedTrailing.startsWith('"') &&
        !trimmedTrailing.startsWith("]") &&
        !trimmedTrailing.startsWith(",") &&
        trailingContent.length > 0
      ) {
        // Verify we're not inside a string by checking quote balance
        const beforeMatch = sanitized.substring(0, trailingContentMatch.index + 1);
        let quoteCount = 0;
        let escaped = false;
        for (const char of beforeMatch) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (char === "\\") {
            escaped = true;
          } else if (char === '"') {
            quoteCount++;
          }
        }
        // If we have balanced quotes (even number), we're outside strings
        // Also verify this is the root closing brace by checking brace balance
        let braceCount = 0;
        for (const char of beforeMatch) {
          if (char === "{") {
            braceCount++;
          } else if (char === "}") {
            braceCount--;
          }
        }
        // Only remove if this is the root closing brace (braceCount should be 0 after the last })
        if (quoteCount % 2 === 0 && braceCount === 0) {
          sanitized = sanitized.substring(0, trailingContentMatch.index + 1);
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed trailing content after JSON: "${trailingContent.substring(0, 30)}..."`,
            );
          }
        }
      }
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    // Use appropriate description based on what was done
    let description: string | undefined;
    if (hasChanges) {
      if (diagnostics.some((d) => d.includes("Extracted largest JSON span"))) {
        description = SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN;
      } else if (
        diagnostics.some(
          (d) => d.includes("code fence") || d.includes("thought") || d.includes("introductory"),
        )
      ) {
        description = SANITIZATION_STEP.STRIPPED_WRAPPERS;
      } else {
        description = SANITIZATION_STEP.STRIPPED_WRAPPERS;
      }
    }

    return {
      content: sanitized,
      changed: hasChanges,
      description,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`stripWrappers sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
