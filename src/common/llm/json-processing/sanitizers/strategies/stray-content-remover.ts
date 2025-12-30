/**
 * Strategy for removing stray content from JSON.
 * Handles AI warnings, package name typos, stray characters, and comment markers.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/** Maximum diagnostics to collect */
const MAX_DIAGNOSTICS = 20;

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

    // Fix stray single characters before property names
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed stray character "${strayChar}" before property "${propertyNameStr}"`);
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Fix stray characters before values
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
        if (diagnostics.length < MAX_DIAGNOSTICS) {
          diagnostics.push(`Removed stray character "${strayChar}" before value: "${propertyNameStr}"`);
        }
        return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
      },
    );

    // Fix stray characters before terminators (for numeric properties)
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed stray character "${strayChar}" for numeric property: "${propertyNameStr}"`);
          }
          return `"${propertyNameStr}": null${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix package name typos
    for (const { pattern, replacement, description } of PACKAGE_NAME_TYPO_PATTERNS) {
      if (pattern.test(sanitized)) {
        const beforeFix = sanitized;
        sanitized = sanitized.replace(pattern, replacement);
        if (sanitized !== beforeFix) {
          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(description);
          }
        }
      }
    }

    // Remove AI-generated content warnings
    const aiWarningPattern =
      /AI-generated\s+content\.\s+Review\s+and\s+use\s+carefully\.\s+Content\s+may\s+be\s+inaccurate\./gi;
    sanitized = sanitized.replace(aiWarningPattern, (match, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < MAX_DIAGNOSTICS) {
        diagnostics.push("Removed AI-generated content warning");
      }
      return "";
    });

    // Remove extra_text stray lines
    const extraTextPattern = /(\n|^)(\s*)(extra_text=[^\n]*)(\s*\n)/g;
    sanitized = sanitized.replace(
      extraTextPattern,
      (match, delimiter, _whitespace, _strayText, newline, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        hasChanges = true;
        if (diagnostics.length < MAX_DIAGNOSTICS) {
          diagnostics.push("Removed stray text (extra_text)");
        }
        return `${delimiterStr}${newlineStr}`;
      },
    );

    // Remove other stray text patterns
    const strayTextPatterns = [
      {
        pattern: /([}\],]|\n|^)(\s*)(ovo\s+je\s+json)(\s*\n)/gi,
        description: "Removed stray text (ovo je json)",
      },
    ];

    for (const { pattern, description } of strayTextPatterns) {
      sanitized = sanitized.replace(
        pattern,
        (match, delimiter, _whitespace, _strayText, newline, offset: number) => {
          if (isInStringAt(offset, sanitized)) {
            return match;
          }
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const newlineStr = typeof newline === "string" ? newline : "";
          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(description);
          }
          return `${delimiterStr}${newlineStr}`;
        },
      );
    }

    // Fix comment markers in JSON (like * "property":)
    const commentMarkerPattern = /([}\],]|\n|^)(\s*)\*(\s+)"([a-zA-Z_$][^"]+)"(\s*[,:])/g;
    sanitized = sanitized.replace(
      commentMarkerPattern,
      (match, delimiter, whitespaceBefore, whitespaceAfter, propertyName, terminator, offset: number) => {
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
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

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};

