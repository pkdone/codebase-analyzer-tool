/**
 * Strategy for removing stray content from JSON.
 * Handles AI warnings, package name typos, stray characters, and comment markers.
 * Uses generic patterns for detecting stray text in a schema-agnostic manner.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";
import { processingConfig } from "../../constants/json-processing.config";

/**
 * Checks if a string looks like stray non-JSON text.
 * Generic detection that doesn't rely on specific hardcoded words.
 *
 * @param text - The text to check
 * @returns True if the text looks like stray content
 */
function looksLikeStrayText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Single characters (not followed by colon for property context)
  if (trimmed.length === 1 && /^[a-zA-Z]$/.test(trimmed)) {
    return true;
  }

  // Short lowercase words (2-15 chars) that aren't JSON keywords
  if (/^[a-z][a-z0-9_-]{1,14}$/i.test(trimmed)) {
    const jsonKeywords = ["true", "false", "null"];
    if (!jsonKeywords.includes(trimmed.toLowerCase())) {
      return true;
    }
  }

  // Text that looks like a sentence fragment or comment
  if (/^[a-z][a-z\s]{5,}$/i.test(trimmed) && trimmed.includes(" ")) {
    return true;
  }

  // Variable assignment patterns (config-like text)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^\s]+$/.test(trimmed)) {
    return true;
  }

  // YAML-like key: value patterns outside of JSON (using character class to avoid escaping)
  if (/^[a-z][a-z0-9_-]*:\s+[^"{[]/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Strategy that removes stray content from JSON.
 */
export const strayContentRemover: SanitizerStrategy = {
  name: "StrayContentRemover",

  apply(input: string, config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    const PACKAGE_NAME_TYPO_PATTERNS = config?.packageNameTypoPatterns ?? [];
    const NUMERIC_PROPERTIES = config?.numericProperties ?? [];

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Pattern 1: Fix stray single characters before property names
    const strayCharBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z])\s+"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      strayCharBeforePropertyPattern,
      (match, delimiter, whitespace, strayChar, propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          offset < 200;

        if (isPropertyContext) {
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(
              `Removed stray character "${strayChar}" before property "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Pattern 2: Fix stray characters before values
    const strayCharBeforeQuotedValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-zA-Z])\s*"([^"]+)"(\s*[,}\]]|[,}\]]|$)/g;
    sanitized = sanitized.replace(
      strayCharBeforeQuotedValuePattern,
      (match, propertyName, strayChar, value, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          diagnostics.push(
            `Removed stray character "${strayChar}" before value: "${propertyNameStr}"`,
          );
        }
        return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
      },
    );

    // Pattern 3: Fix stray characters before terminators (for numeric properties)
    const strayCharBeforeCommaPattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-zA-Z])(\s*[,}\]]|[,}\]]|$)/g;
    sanitized = sanitized.replace(
      strayCharBeforeCommaPattern,
      (match, propertyName, strayChar, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const lowerPropertyName = propertyNameStr.toLowerCase();

        if (NUMERIC_PROPERTIES.includes(lowerPropertyName)) {
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(
              `Removed stray character "${strayChar}" for numeric property: "${propertyNameStr}"`,
            );
          }
          return `"${propertyNameStr}": null${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 4: Fix package name typos (fallback mechanism)
    for (const { pattern, replacement, description } of PACKAGE_NAME_TYPO_PATTERNS) {
      if (pattern.test(sanitized)) {
        const beforeFix = sanitized;
        sanitized = sanitized.replace(pattern, replacement);
        if (sanitized !== beforeFix) {
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(description);
          }
        }
      }
    }

    // Pattern 5: Remove AI-generated content warnings (generic pattern)
    const aiWarningPattern =
      /AI-generated\s+content\.\s+Review\s+and\s+use\s+carefully\.\s+Content\s+may\s+be\s+inaccurate\./gi;
    sanitized = sanitized.replace(aiWarningPattern, (match, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
        diagnostics.push("Removed AI-generated content warning");
      }
      return "";
    });

    // Pattern 6: Remove extra_text= stray lines (generic pattern for extra_* attributes)
    const extraAttributePattern = /(\n|^)(\s*)(extra_[a-z_]+\s*=?\s*[^\n]*)(\s*\n)/gi;
    sanitized = sanitized.replace(
      extraAttributePattern,
      (match, delimiter, _whitespace, strayText, newline, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          const preview = typeof strayText === "string" ? strayText.substring(0, 30) : "";
          diagnostics.push(`Removed stray text (${preview}...)`);
        }
        return `${delimiterStr}${newlineStr}`;
      },
    );

    // Pattern 7: Generic removal of stray text on its own line between JSON elements
    const strayTextOnOwnLinePattern =
      /([}\],])\s*\n\s*([a-zA-Z_][a-zA-Z0-9_-]{1,30})\s*\n(\s*"|\s*[}\]])/g;
    sanitized = sanitized.replace(
      strayTextOnOwnLinePattern,
      (match, delimiter, strayText, continuation, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";

        // Check if it looks like stray text (not a valid JSON element)
        if (looksLikeStrayText(strayTextStr)) {
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const continuationStr = typeof continuation === "string" ? continuation : "";
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Removed stray text '${strayTextStr}'`);
          }
          return `${delimiterStr}\n${continuationStr}`;
        }

        return match;
      },
    );

    // Pattern 8: Remove YAML-like blocks embedded in JSON
    // e.g., "semantically-similar-code-detection-results:" followed by indented YAML
    const yamlBlockPattern =
      /([}\],]|\n)(\s*)([a-z][a-z0-9_-]+:)\s*\n((?:\s+-\s+[^\n]+\n?)+)(\s*")/gi;
    sanitized = sanitized.replace(
      yamlBlockPattern,
      (match, delimiter, _whitespace, yamlKey, _yamlContent, continuation, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const continuationStr = typeof continuation === "string" ? continuation : "";
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          const keyPreview = typeof yamlKey === "string" ? yamlKey.substring(0, 30) : "";
          diagnostics.push(`Removed YAML block: ${keyPreview}...`);
        }
        return `${delimiterStr}\n${continuationStr}`;
      },
    );

    // Pattern 9: Fix comment markers in JSON (like * "property":)
    const commentMarkerPattern = /([}\],]|\n|^)(\s*)\*(\s+)"([a-zA-Z_$][^"]+)"(\s*[,:])/g;
    sanitized = sanitized.replace(
      commentMarkerPattern,
      (
        match,
        delimiter,
        whitespaceBefore,
        whitespaceAfter,
        propertyName,
        terminator,
        offset: number,
      ) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch) ||
          /\[\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          offset < 200;

        if (isPropertyContext) {
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceBeforeStr = typeof whitespaceBefore === "string" ? whitespaceBefore : "";
          const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Removed comment marker before property: * "${propertyNameStr}"`);
          }

          let finalWhitespace = whitespaceAfterStr || whitespaceBeforeStr;
          const isInArrayContext = /\[\s*$/.test(beforeMatch) || /\[\s*\n\s*$/.test(beforeMatch);
          if (isInArrayContext && finalWhitespace === "") {
            finalWhitespace = "    ";
          }

          if (delimiterStr === "") {
            return `${finalWhitespace}"${propertyNameStr}"${terminatorStr}`;
          }
          return `${delimiterStr}${finalWhitespace}"${propertyNameStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 10: Generic removal of sentence-like text before properties
    // This catches LLM commentary like "there are more methods, but I will stop here"
    const sentenceBeforePropertyPattern =
      /([}\],])\s*\n\s*([a-z][a-z\s,.'!?-]{10,60})\s*\n(\s*"[a-zA-Z_$])/gi;
    sanitized = sanitized.replace(
      sentenceBeforePropertyPattern,
      (match, delimiter, sentenceText, continuation, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const sentenceStr = typeof sentenceText === "string" ? sentenceText.trim() : "";

        // Check if it looks like a sentence (contains spaces, doesn't look like JSON)
        if (sentenceStr.includes(" ") && sentenceStr.length > 10) {
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const continuationStr = typeof continuation === "string" ? continuation : "";
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            const preview = sentenceStr.substring(0, 30);
            diagnostics.push(`Removed LLM commentary: "${preview}..."`);
          }
          return `${delimiterStr}\n${continuationStr}`;
        }

        return match;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};
