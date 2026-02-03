/**
 * Replacement rules for removing stray commentary and LLM meta-talk from JSON responses.
 *
 * This module handles:
 * - Generic stray text lines between JSON elements
 * - Sentence-like text (LLM explanations) before properties
 * - Conversational filler text from LLM responses
 * - Config-like text accidentally included before properties
 *
 * These rules target *unwanted* artifacts, not valid natural language content
 * that may exist within JSON string values.
 */

import type { ReplacementRule } from "../replacement-rule.types";
import { parsingHeuristics } from "../../../constants/json-processing.config";
import { looksLikeSentenceStructure } from "../../../utils/stray-text-detection";
import { safeGroup, safeGroups3, safeGroups4 } from "../../../utils/safe-group-extractor";
import { isValidEmbeddedContentContext } from "./extra-property-rules";

/**
 * Rules for removing stray commentary and LLM conversational artifacts from JSON.
 */
export const STRAY_COMMENTARY_RULES: readonly ReplacementRule[] = [
  // Rule: Remove generic stray text on its own line between JSON elements
  // Pattern: `],\ntrib\n  "property":` -> `],\n  "property":`
  {
    name: "genericStrayTextLine",
    pattern: /([}\],])\s*\n\s*([a-zA-Z_][a-zA-Z0-9_-]{1,30})\s*\n(\s*"|\s*[}\]])/g,
    replacement: (_match, groups) => {
      const strayText = safeGroup(groups, 1);
      // Check if it looks like stray text
      const jsonKeywords = ["true", "false", "null"];
      if (jsonKeywords.includes(strayText.toLowerCase())) {
        return null;
      }
      // Short words or words with dashes/underscores are likely stray
      const isStray =
        strayText.length <= 15 ||
        strayText.includes("-") ||
        strayText.includes("_") ||
        /^[a-z]+$/.test(strayText);
      if (!isStray) {
        return null;
      }
      const [delimiter, , continuation] = safeGroups3(groups);
      return `${delimiter}\n${continuation}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = safeGroup(groups, 1);
      return `Removed stray text '${strayText}'`;
    },
  },

  // Rule: Remove sentence-like text before properties
  // Pattern: `],\nthere are more methods, but...\n  "property":` -> `],\n  "property":`
  {
    name: "sentenceLikeTextBeforeProperty",
    pattern: /([}\],])\s*\n\s*([a-z][a-z\s,.'!?-]{10,60})\s*\n(\s*"[a-zA-Z_$])/gi,
    replacement: (_match, groups) => {
      const sentenceText = safeGroup(groups, 1).trim();
      // Check if it looks like a sentence (contains spaces, doesn't look like JSON)
      if (!sentenceText.includes(" ") || sentenceText.length <= 10) {
        return null;
      }
      const [delimiter, , continuation] = safeGroups3(groups);
      return `${delimiter}\n${continuation}`;
    },
    diagnosticMessage: (_match, groups) => {
      const sentenceText = safeGroup(groups, 1).trim().substring(0, 30);
      return `Removed LLM commentary: "${sentenceText}..."`;
    },
  },

  // Rule: Remove stray text/comments from JSON using structural sentence detection
  // Pattern: `],\nthis is some text...\n  {` -> `],\n  {`
  // Uses structural detection (word count, punctuation) instead of hardcoded word lists
  {
    name: "strayEnglishText",
    pattern: /([}\],])\s*\n\s*([a-z][a-z\s,.'!?-]{5,100}?)\s*\n\s*([{[]|")/gi,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;
      const isAfterDelimiter = /[}\],]\s*\n\s*$/.test(beforeMatch);
      if (!isAfterDelimiter && context.offset > parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT) {
        return null;
      }

      const strayText = safeGroup(groups, 1).trim();

      // Use structural detection: check if it looks like sentence-like content
      if (!looksLikeSentenceStructure(strayText)) {
        return null;
      }

      const [delimiter, , nextChar] = safeGroups3(groups);
      return `${delimiter}\n${nextChar}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = safeGroup(groups, 1).trim();
      return `Removed stray text: "${strayText}"`;
    },
  },

  // Rule: Remove config-like text before properties
  // Pattern: `post_max_size = 20M    "purpose":` -> `"purpose":`
  {
    name: "configTextBeforeProperty",
    pattern:
      /([}\],]|\n|^)(\s*)([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^\s"]{1,20})\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g,
    replacement: (_match, groups, context) => {
      if (!isValidEmbeddedContentContext(context)) {
        return null;
      }
      const [delimiter, whitespace, , propertyWithQuote] = safeGroups4(groups);
      return `${delimiter}${whitespace}${propertyWithQuote}`;
    },
    diagnosticMessage: (_match, groups) => {
      const configText = safeGroup(groups, 2);
      const propertyWithQuote = safeGroup(groups, 3);
      return `Removed config text '${configText}' before property: ${propertyWithQuote}`;
    },
  },
];
