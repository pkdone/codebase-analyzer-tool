/**
 * Strategy for removing duplicate and corrupted array entries.
 * Handles entries that appear to be duplicated or corrupted by LLM output.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/**
 * Strategy that removes duplicate and corrupted array entries.
 */
export const duplicateEntryRemover: SanitizerStrategy = {
  name: "DuplicateEntryRemover",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Pattern 1: Remove duplicate entries with missing opening quote (ending with comma or bracket)
    const duplicateEntryPattern1 = /"([^"]+)"\s*,\s*\n\s*([a-z]+)\.[^"]*"(\s*[,\]])/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern1,
      (match, validEntry, prefix, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 100), offset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const looksLikeCorruptionMarker =
          /^(extra|duplicate|repeat|copy|another|second|third|additional|redundant|spurious)/i.test(
            prefixStr,
          );

        if (isInArrayContext && looksLikeCorruptionMarker) {
          hasChanges = true;
          const validEntryStr = typeof validEntry === "string" ? validEntry : "";
          diagnostics.push(
            `Removed duplicate entry starting with "${prefixStr}" after "${validEntryStr}"`,
          );
          // Preserve the terminator (comma or bracket)
          return `"${validEntryStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 2: Remove quoted entries that start with corruption markers
    const duplicateEntryPattern2 =
      /"([^"]+)"\s*,\s*\n?\s*"(extra|duplicate|repeat|copy|another|second|third|additional|redundant|spurious)[^"]*"(\s*[,\]]\s*|\s*\n)/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern2,
      (match, validEntry, prefix, delimiter, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 100), offset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n?\s*$/.test(beforeMatch);

        if (isInArrayContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          // Preserve proper delimiter (convert ] to just ] without comma)
          const cleanDelimiter = delimiterStr.includes("]") ? "]" : delimiterStr;
          diagnostics.push(
            `Removed duplicate entry starting with "${prefix}" after "${validEntry}"`,
          );
          return `"${validEntry}"${cleanDelimiter}`;
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
