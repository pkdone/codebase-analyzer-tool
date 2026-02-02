/**
 * Replacement rules for handling corrupted string values in JSON.
 * This module handles LLM-specific string corruption patterns:
 * - Repetitive character sequences (e.g., "} } } } }" repeated thousands of times)
 * - Repetitive newlines (e.g., "\n\n\n\n\n" repeated many times)
 * - JSON structure embedded in string values (e.g., LLM "leaking" JSON into strings)
 * - LLM instruction text appended after JSON (e.g., "[instruction]Fix the bug...")
 *
 * These patterns cause "Unterminated string in JSON" errors because the LLM
 * generates repetitive content inside string values until the response is truncated,
 * leaving the string unclosed.
 */

import type { ReplacementRule } from "../replacement-rule.types";

/**
 * Minimum number of repetitions to trigger truncation.
 * Set high enough to avoid false positives on legitimate content.
 */
const MIN_REPETITIONS_TO_TRUNCATE = 10;

/**
 * Maximum repetitions to keep after truncation.
 * Keeps a small sample for diagnostic purposes.
 */
const MAX_REPETITIONS_TO_KEEP = 3;

/**
 * Rules for fixing corrupted string values in JSON.
 * These rules target patterns where LLMs generate runaway repetitive sequences
 * inside string values, causing the JSON to be malformed.
 */
export const STRING_CORRUPTION_RULES: readonly ReplacementRule[] = [
  // Rule: Fix repetitive closing braces in string values
  // Pattern: `"returnType": "void method() { } } } } } } } } } } } ...` (unterminated)
  // This occurs when the LLM generates thousands of "} " sequences inside a string value
  {
    name: "repetitiveClosingBracesInString",
    // Match a property with a string value containing repetitive "} " sequences
    // The string never closes due to truncation
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"[^"]*?(?:\.\.\.|[{(])?\s*)((?:}\s+){10,})(}*\s*$)/g,
    replacement: (_match, groups) => {
      const [beforeRepetition, repetitiveSection, trailingBraces] = groups;
      const beforeStr = beforeRepetition ?? "";
      const repetitiveSectionStr = repetitiveSection ?? "";

      // Count how many "} " sequences there are
      const repetitionCount = (repetitiveSectionStr.match(/}\s+/g) ?? []).length;

      if (repetitionCount < MIN_REPETITIONS_TO_TRUNCATE) {
        // Not enough repetitions to be confident this is corruption
        return null;
      }

      // Keep a few closing braces as a marker that content was truncated
      const keptBraces = "} ".repeat(MAX_REPETITIONS_TO_KEEP).trim();

      // Close the string and try to close the JSON structure
      // We need to figure out if we should add closing braces for the object
      const trailingBracesStr = trailingBraces ?? "";
      const hasTrailingBraces = trailingBracesStr.includes("}");

      if (hasTrailingBraces) {
        // There are trailing braces outside the string, just close the string
        return `${beforeStr}${keptBraces}..."`;
      }

      // No trailing structure, close the string and add minimal structure
      return `${beforeStr}${keptBraces}..."\n}`;
    },
    diagnosticMessage: (_match, groups) => {
      const repetitiveSection = groups[1] ?? "";
      const count = (repetitiveSection.match(/}\s+/g) ?? []).length;
      return `Truncated ${count} repetitive closing braces in string value`;
    },
    skipInString: false, // This rule specifically targets content within strings
  },

  // Rule: Fix repetitive newlines in string values
  // Pattern: `"returnType": "void\n\n\n\n\n\n\n\n\n\n...` (unterminated due to excessive newlines)
  {
    name: "repetitiveNewlinesInString",
    // Match a property with a string value containing many consecutive newlines
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"[^"]*?)((?:\\n\s*){10,}|(?:\n\s*){10,})([^"]*$)/g,
    replacement: (_match, groups) => {
      const [beforeRepetition, repetitiveSection, afterRepetition] = groups;
      const beforeStr = beforeRepetition ?? "";
      const repetitiveSectionStr = repetitiveSection ?? "";
      const afterStr = afterRepetition ?? "";

      // Count newlines
      const newlineCount =
        (repetitiveSectionStr.match(/\\n/g) ?? []).length +
        (repetitiveSectionStr.match(/\n/g) ?? []).length;

      if (newlineCount < MIN_REPETITIONS_TO_TRUNCATE) {
        return null;
      }

      // Check if the content after repetition looks like it's still trying to be a string
      // or if it's completely truncated
      const afterTrimmed = afterStr.trim();
      const looksLikeTruncated =
        afterTrimmed === "" || afterTrimmed.endsWith("}") || !afterTrimmed.includes('"');

      if (looksLikeTruncated) {
        // Close the string and structure
        return `${beforeStr}..."\n}`;
      }

      // There might be more content, just truncate the newlines
      return `${beforeStr}\\n...${afterStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const repetitiveSection = groups[1] ?? "";
      const count =
        (repetitiveSection.match(/\\n/g) ?? []).length +
        (repetitiveSection.match(/\n/g) ?? []).length;
      return `Truncated ${count} repetitive newlines in string value`;
    },
    skipInString: false,
  },

  // Rule: Fix JSON structure embedded in string values (escaped version)
  // Pattern: `"value": "0\",\n    \"type\": \"String"` - LLM "leaking" JSON into string values
  // This happens when the LLM confuses the context and starts outputting JSON structure inside a string
  {
    name: "embeddedJsonInStringValue",
    // Match a string value that contains what looks like JSON property definitions
    // The pattern is: a quoted value followed by escaped quotes and property-like patterns
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"]{0,50})\\",\\n\s*\\"([a-zA-Z_$][a-zA-Z0-9_$]*)\\"\s*:\s*\\"([^"\\]*)$/g,
    replacement: (_match, groups) => {
      const [propertyStart, value, ,] = groups;
      const propertyStartStr = propertyStart ?? "";
      const valueStr = value ?? "";

      // The LLM was trying to output JSON structure inside the string
      // We'll close the current property and try to salvage what we can
      return `${propertyStartStr}${valueStr}"\n}`;
    },
    diagnosticMessage: "Fixed JSON structure embedded in string value",
    skipInString: false,
  },

  // Rule: Fix JSON structure embedded in string values (literal newline version)
  // Pattern: `"value": "yyyy-MM-dd",\n    "type": "String"` embedded IN a string value
  // This occurs when the LLM outputs what looks like object properties inside a string,
  // with actual newlines and quotes that break the JSON structure.
  // Examples from errors:
  //   "value": "yyyy-MM-dd\",\n    \"type\": \"String"
  //   "returnType": "Builder\",\n      \"description\": \"This method..."
  {
    name: "embeddedJsonInStringValueLiteralNewline",
    // Match property value containing literal quote-comma-newline-quote pattern
    // This is the signature of JSON properties being output inside a string
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"]{0,200}?)\\",\n\s*\\"([a-zA-Z_$][a-zA-Z0-9_$]*)\\"\s*:\s*\\"/g,
    replacement: (_match, groups) => {
      const [propertyStart, value] = groups;
      const propertyStartStr = propertyStart ?? "";
      const valueStr = value ?? "";

      // Close the string properly with just the original value
      return `${propertyStartStr}${valueStr}"`;
    },
    diagnosticMessage: "Fixed JSON structure with literal newlines embedded in string value",
    skipInString: false,
  },

  // Rule: Fix extended embedded JSON that continues for multiple properties
  // Pattern: LLM outputs many JSON-like properties inside a string value, continuing for many lines
  // Example from errors - the content continues with more and more escaped JSON
  {
    name: "extendedEmbeddedJsonInString",
    // Match patterns where a string contains multiple embedded JSON-like properties
    // Looking for repeated patterns of \",\n  \"propName\": \"value
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"]{0,100}?)((?:\\",\n\s*\\"[a-zA-Z_$][a-zA-Z0-9_$]*\\"\s*:\s*){2,})/g,
    replacement: (_match, groups) => {
      const [propertyStart, value, embeddedJson] = groups;
      const propertyStartStr = propertyStart ?? "";
      const valueStr = value ?? "";
      const embeddedJsonStr = embeddedJson ?? "";

      // Count how many embedded properties there are
      const propertyCount = (embeddedJsonStr.match(/\\",\n\s*\\"/g) ?? []).length;

      // Only apply if there are at least 2 embedded property patterns
      if (propertyCount < 2) {
        return null;
      }

      // Close the string properly with just the original value
      return `${propertyStartStr}${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const embeddedJson = groups[2] ?? "";
      const count = (embeddedJson.match(/\\",\n\s*\\"/g) ?? []).length;
      return `Fixed ${count} embedded JSON properties in string value`;
    },
    skipInString: false,
  },

  // Rule: Remove LLM instruction text appended after JSON
  // Pattern: `}\n[instruction]Fix the bug in the following code...`
  // This happens when the LLM appends instructions or code examples after the JSON output
  {
    name: "llmInstructionTextAfterJson",
    // Match closing brace/bracket followed by instruction-like text
    pattern: /([}\]])\s*\n*\s*\[(?:instruction|output|input|code|example|fix|solution)\][^\]]*$/gi,
    replacement: (_match, groups) => {
      const delimiter = groups[0] ?? "}";
      return delimiter;
    },
    diagnosticMessage: "Removed LLM instruction text appended after JSON",
  },

  // Rule: Fix property values that have embedded JSON-like content (escaped \\n version)
  // Pattern: `"returnType": "int\\",\\n      \\"description\\": \\"...`
  // The LLM outputs escaped JSON within what should be a simple string value
  {
    name: "escapedJsonInPropertyValue",
    // Match property values that contain escaped JSON structure patterns with \\n
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"]{1,100}?)\\",\s*\\n\s*\\"([a-zA-Z_$][a-zA-Z0-9_$]*)\\"\s*:\s*\\"[^"]*$/g,
    replacement: (_match, groups) => {
      const [propertyStart, value] = groups;
      const propertyStartStr = propertyStart ?? "";
      const valueStr = value ?? "";

      // Close the string with just the value before the corruption
      return `${propertyStartStr}${valueStr}"\n}`;
    },
    diagnosticMessage: "Fixed escaped JSON structure in property value",
    skipInString: false,
  },

  // Rule: Fix property values that have embedded JSON-like content (literal newline version)
  // Pattern: `"returnType": "int\",\n      \"description\": \"...` (with actual newlines)
  // This is similar to the above but matches actual newlines instead of escaped \\n
  {
    name: "escapedJsonInPropertyValueLiteralNewline",
    // Match property values that contain escaped JSON structure with actual newlines
    // The pattern looks for: "propName": "value\",\n   \"anotherProp\": \"...
    pattern:
      /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"]{1,200}?)\\",\n\s*\\"([a-zA-Z_$][a-zA-Z0-9_$]*)\\"\s*:\s*\\"[^"]*$/g,
    replacement: (_match, groups) => {
      const [propertyStart, value] = groups;
      const propertyStartStr = propertyStart ?? "";
      const valueStr = value ?? "";

      // Close the string with just the value before the corruption
      return `${propertyStartStr}${valueStr}"\n}`;
    },
    diagnosticMessage: "Fixed escaped JSON structure with literal newlines in property value",
    skipInString: false,
  },

  // Rule: Fix truncated response ending with unclosed string containing repetitive content
  // Pattern: String value that ends abruptly with repetitive patterns and no closing structure
  {
    name: "truncatedStringWithRepetitiveEnd",
    // Match patterns where a string value ends with repetitive simple characters
    pattern: /("(?:[a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"[^"]*?)(\s*[}\])\s,;]+){20,}\s*$/g,
    replacement: (_match, groups) => {
      const beforeRepetition = groups[0] ?? "";

      // Close the string and add minimal structure
      return `${beforeRepetition}..."\n}`;
    },
    diagnosticMessage: "Fixed truncated string with repetitive ending",
    skipInString: false,
  },
];
