/**
 * Replacement rules for handling LLM-specific artifacts in JSON.
 * This module handles:
 * - Binary corruption markers
 * - AI-generated content warnings
 * - Truncated/explanatory text in arrays
 */

import type { ReplacementRule } from "../../../../types/sanitizer-config.types";
import {
  looksLikeTruncationMarker,
  looksLikeFirstPersonStatement,
  looksLikeSentenceStructure,
} from "../../../utils/stray-text-detection";

/**
 * Rules for removing LLM-specific artifacts from JSON.
 */
export const LLM_ARTIFACT_RULES: readonly ReplacementRule[] = [
  // Rule: Remove binary corruption markers
  // Pattern: `<x_bin_151>publicConstants":` -> `"publicConstants":`
  {
    name: "binaryCorruptionMarker",
    pattern: /([}\],]|\n|^)(\s*)<x_bin_\d+>([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyName] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyNameStr = propertyName ?? "";
      return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
    },
    diagnosticMessage: "Removed binary corruption marker",
  },

  // Rule: Remove AI-generated content warnings
  // Pattern: `AI-generated content. Review and use carefully...` -> remove
  {
    name: "aiContentWarning",
    pattern:
      /AI-generated\s+content\.\s+Review\s+and\s+use\s+carefully\.\s+Content\s+may\s+be\s+inaccurate\./gi,
    replacement: () => "",
    diagnosticMessage: "Removed AI-generated content warning",
  },

  // Rule: Remove truncated/explanatory text in arrays using structural detection
  // Pattern: `[]\n    },\nsome explanatory text"` -> `[]\n    },\n`
  // Uses structural detection (truncation markers, first-person statements) instead of hardcoded phrases
  {
    name: "truncatedExplanatoryTextInArray",
    pattern: /(\[\s*\]\s*\n\s*}\s*,\s*\n)\s*([a-zA-Z][^"]{3,100}?)"/gi,
    replacement: (_match, groups) => {
      const explanatoryText = (groups[1] ?? "").trim();

      // Use structural detection: check if it looks like truncation/explanation
      const isTruncation = looksLikeTruncationMarker(explanatoryText);
      const isFirstPerson = looksLikeFirstPersonStatement(explanatoryText);
      const isSentence = looksLikeSentenceStructure(explanatoryText);

      // Only remove if it matches our structural patterns
      if (!isTruncation && !isFirstPerson && !isSentence) {
        return null;
      }

      const prefix = groups[0] ?? "";
      return prefix;
    },
    diagnosticMessage: "Removed truncated/explanatory text in array",
  },
];
