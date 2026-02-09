/**
 * Replacement rules for handling LLM metadata property patterns (extra_*, _llm_*, _ai_*).
 * This module handles:
 * - extra_text= style attributes
 * - Invalid extra_* property structures
 * - Missing commas before extra_text
 * - extra_thoughts: blocks
 * - Stray extra_* lines
 * - Invalid property blocks
 * - Schema-aware unknown property detection (properties with LLM artifact patterns)
 *
 * The rules use generic patterns to detect LLM-generated metadata properties
 * rather than hardcoded word lists, making them more robust against new LLM behaviors.
 */

import type { ReplacementRule, ContextInfo } from "../../../../types/sanitizer-config.types";
import { parsingHeuristics } from "../../../constants/json-processing.config";
import { findJsonValueEnd } from "../../../utils/parser-context-utils";
import { shouldRemoveAsLLMArtifact } from "../../../utils/llm-artifact-detection";

/**
 * Checks if a context is valid for embedded content removal.
 */
export function isValidEmbeddedContentContext(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[}\],]\s*$/.test(beforeMatch) ||
    /^\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT
  );
}

/**
 * Rules for removing LLM metadata property patterns (extra_*, _llm_*, _ai_*).
 */
export const LLM_METADATA_PROPERTY_RULES: readonly ReplacementRule[] = [
  // Rule: Remove extra_text= style attributes
  // Pattern: `extra_text="  "externalReferences": [` -> `"externalReferences": [`
  {
    name: "extraTextAttribute",
    pattern: /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+)\s*=\s*"([^"]*)"(\s*"|\s*\n)/g,
    replacement: (_match, groups, context) => {
      // Check if the content after the closing quote looks like JSON
      const { fullContent, offset } = context;
      const matchLen = typeof _match === "string" ? _match.length : 0;
      const afterMatch = fullContent.substring(offset + matchLen);
      const looksLikeJson = /^\s*"[a-zA-Z_$]|\s*[{[]/.test(afterMatch);

      const [delimiter, whitespace, , , next] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const nextStr = next ?? "";

      // If next part looks like JSON continuation, preserve it
      if (looksLikeJson || nextStr.startsWith('"')) {
        // Remove any leading whitespace from the next part
        const cleanedNext = nextStr.trimStart();
        return `${delimiterStr}${whitespaceStr}${cleanedNext}`;
      }
      return `${delimiterStr}${whitespaceStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const attrName = groups[2] ?? "";
      return `Removed ${attrName}= attribute`;
    },
  },

  // Rule: Remove extra_text= with whitespace before JSON property (more specific)
  // Pattern: `extra_text="  "externalReferences":` -> `"externalReferences":`
  {
    name: "extraTextAttributeWithWhitespace",
    pattern: /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+)\s*=\s*"(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, , , propertyWithQuote] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyWithQuoteStr = propertyWithQuote ?? "";
      return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const attrName = groups[2] ?? "";
      return `Removed ${attrName}= attribute with whitespace`;
    },
  },

  // Rule: Remove invalid property-like structures
  // Pattern: `extra_text="  * `DatatableExportTargetParameter`..."` -> remove
  {
    name: "invalidExtraPropertyStructure",
    pattern: /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+)\s*=\s*"[^"]*"\s*,?\s*\n/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      return `${delimiterStr}${whitespaceStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const invalidProp = groups[2] ?? "";
      return `Removed invalid property-like structure: ${invalidProp}=...`;
    },
  },

  // Rule: Add missing comma after array when extra_* properties appear
  // Pattern: `]\n    extra_text:` -> `],\n    extra_text:`
  {
    name: "missingCommaBeforeExtraText",
    pattern: /(\])\s*\n(\s*)((?:extra_|_llm_|_ai_)[a-z_]+)\s*:/gi,
    replacement: (_match, groups) => {
      const [closingBracket, whitespace, extraText] = groups;
      const closingBracketStr = closingBracket ?? "";
      const whitespaceStr = whitespace ?? "";
      const extraTextStr = extraText ?? "";
      return `${closingBracketStr},\n${whitespaceStr}${extraTextStr}:`;
    },
    diagnosticMessage: (_match, groups) => {
      const extraText = groups[2] ?? "";
      return `Added missing comma after array before ${extraText}:`;
    },
  },

  // Rule: Remove invalid extra_*: property blocks (simple version)
  // Pattern: `extra_thoughts: I've identified all...` -> remove
  {
    name: "extraThoughtsBlock",
    pattern: /([}\],]|\n)(\s*)(extra_[a-z_]+):\s*[^\n{["]*\n(\s*")/gi,
    replacement: (_match, groups) => {
      const [delimiter, , , continuation] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = continuation ?? "";
      return `${delimiterStr}${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const extraProp = groups[2] ?? "";
      return `Removed ${extraProp}: block`;
    },
  },

  // Rule: Remove extra_*= stray lines
  // Pattern: `\nextra_text= "some text"\n` -> remove line
  {
    name: "extraTextStrayLine",
    pattern: /(\n|^)(\s*)(extra_[a-z_]+\s*=?\s*[^\n]*)(\s*\n)/gi,
    replacement: (_match, groups) => {
      const [delimiter, , , newline] = groups;
      const delimiterStr = delimiter ?? "";
      const newlineStr = newline ?? "";
      return `${delimiterStr}${newlineStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = (groups[2] ?? "").substring(0, 30);
      return `Removed stray text (${strayText}...)`;
    },
    contextCheck: isValidEmbeddedContentContext,
  },

  // Rule: Remove invalid property blocks (extra_*, _llm_*, _ai_*)
  // Pattern: `extra_code_analysis: {` -> remove entire property block
  {
    name: "invalidPropertyBlock",
    pattern: /([}\],]|\n|^)(\s*)((?:extra_|_llm_|_ai_)[a-z_]+):\s*{/gi,
    replacement: (_match, groups, context) => {
      // Find the matching closing brace for this invalid property block
      const { fullContent, offset } = context;
      const matchStr = _match;

      // Use findJsonValueEnd to locate the matching closing brace.
      // The regex pattern ends with `{`, so the opening brace is at the last character
      // of the match. We pass that position to findJsonValueEnd.
      const openBracePosition = offset + matchStr.length - 1;
      const valueEndResult = findJsonValueEnd(fullContent, openBracePosition);

      // If we couldn't find the closing brace, skip this replacement
      if (!valueEndResult.success) {
        return null;
      }

      const [delimiter, whitespace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";

      // Return the replacement that removes the entire invalid property block
      return `${delimiterStr}${whitespaceStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const invalidProp = groups[2] ?? "";
      return `Removed invalid property block: ${invalidProp}`;
    },
    skipInString: true,
  },

  // Rule: Remove properties with LLM artifact patterns (schema-aware)
  // Pattern: Properties containing artifact-indicating words in key names
  // Extended list: thought, thinking, reasoning, scratchpad, analysis, trace, chain, scratch, intermediate
  // Uses schema-aware detection - if knownProperties provided, only removes unknown properties
  {
    name: "llmArtifactPropertyByPattern",
    pattern:
      /([,{])\s*"([a-zA-Z_][a-zA-Z0-9_]*(?:thought|thinking|reasoning|scratchpad|analysis|trace|chain|scratch|intermediate|working_memory|step_by_step)[a-zA-Z0-9_]*)"\s*:\s*/gi,
    replacement: (_match, groups, context) => {
      const propertyName = groups[1] ?? "";
      const knownProperties = context.config?.knownProperties;

      // Check if this should be removed using schema-aware detection
      if (!shouldRemoveAsLLMArtifact(propertyName, knownProperties)) {
        return null;
      }

      const { fullContent, offset } = context;
      const matchStr = typeof _match === "string" ? _match : "";
      const valueStartPos = offset + matchStr.length;

      // Use findJsonValueEnd to locate the end of the value
      const valueEndResult = findJsonValueEnd(fullContent, valueStartPos);

      // If parsing failed, skip this match
      if (!valueEndResult.success) {
        return null;
      }

      const delimiterStr = groups[0] ?? "";
      return delimiterStr;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[1] ?? "";
      return `Removed LLM artifact property: ${propertyName}`;
    },
    skipInString: true,
  },
];
