/**
 * Replacement rules for handling embedded non-JSON content.
 * This module handles:
 * - YAML-like blocks embedded in JSON
 * - Java code after JSON
 * - extra_text, extra_thoughts patterns
 * - Binary corruption markers
 * - AI-generated content warnings
 */

import type { ReplacementRule, ContextInfo } from "./replacement-rule.types";
import { parsingHeuristics } from "../../constants/json-processing.config";
import {
  looksLikeSentenceStructure,
  looksLikeTruncationMarker,
  looksLikeFirstPersonStatement,
} from "../../utils/stray-text-detection";

/**
 * Checks if a context is valid for embedded content removal.
 */
function isValidEmbeddedContentContext(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[}\],]\s*$/.test(beforeMatch) ||
    /^\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT
  );
}

/**
 * Checks if a key looks like a YAML/non-JSON key that should be removed.
 * Generic detection based on structural patterns rather than specific strings.
 *
 * When knownProperties is provided, the function first checks if the key
 * is a valid schema property - if so, it's NOT considered a non-JSON key.
 *
 * @param key - The key to check
 * @param knownProperties - Optional list of known schema properties
 * @returns true if the key looks like non-JSON content that should be removed
 */
function looksLikeNonJsonKey(key: string, knownProperties?: readonly string[]): boolean {
  // If we have schema metadata and the key is a known property, don't remove it
  if (knownProperties && knownProperties.length > 0) {
    const lowerKey = key.toLowerCase();
    if (knownProperties.some((p) => p.toLowerCase() === lowerKey)) {
      return false;
    }
  }

  const lowerKey = key.toLowerCase();
  // Match patterns: extra_*, llm_*, ai_*, _* prefix, or hyphenated keys (YAML-style)
  return (
    /^(?:extra|llm|ai)_[a-z_]+$/i.test(key) ||
    /^_[a-z_]+$/i.test(key) ||
    /^[a-z][a-z0-9_]*(?:-[a-z][a-z0-9_]+)+$/i.test(key) || // hyphenated keys like "my-yaml-key"
    /_(thoughts?|text|notes?|info|reasoning|analysis)$/i.test(lowerKey)
  );
}

/**
 * Rules for removing embedded non-JSON content.
 */
export const EMBEDDED_CONTENT_RULES: readonly ReplacementRule[] = [
  // Rule: Generic YAML list block removal
  // Catches any key followed by YAML-style list items (- item\n- item2\n)
  // Covers: extra_*, llm_*, ai_*, _*, hyphenated-keys, and other non-JSON keys
  // Pattern: `some-yaml-key:\n  - item1\n  - item2\n  "property":` -> `"property":`
  // Uses schema-aware checking to avoid removing valid schema properties
  {
    name: "genericYamlListBlock",
    pattern:
      /([}\],]|\n|,)(\s*)([a-z][a-z0-9_-]*(?:[_-][a-z0-9_-]+)*:)\s*\n((?:\s+(?:-\s+)?[^\n]+\n)+)(\s*")/gi,
    replacement: (_match, groups, context) => {
      const [delimiter, , yamlKey] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = groups[4] ?? "";
      const keyStr = (yamlKey ?? "").replace(/:$/, "");

      // Only remove if the key looks like a non-JSON key (schema-aware)
      const knownProperties = context.config?.knownProperties;
      if (!looksLikeNonJsonKey(keyStr, knownProperties)) {
        return null;
      }

      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const yamlKey = (groups[2] ?? "").substring(0, 30);
      return `Removed YAML list block: ${yamlKey}`;
    },
  },

  // Rule: Generic YAML simple value removal
  // Catches any non-JSON key followed by simple text value (not JSON structure)
  // Covers: extra_thoughts: some text, my-key: value, etc.
  // Pattern: `extra_thoughts: I've identified all...` -> remove
  // Uses schema-aware checking to avoid removing valid schema properties
  {
    name: "genericYamlSimpleValue",
    pattern:
      /([}\],]|\n)(\s*)([a-z][a-z0-9_-]*(?:[_-][a-z0-9_-]+)*:)\s*([^\n{"[\]]{10,200}?)\s*\n(\s*")/gi,
    replacement: (_match, groups, context) => {
      const [delimiter, , yamlKey] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = groups[4] ?? "";
      const keyStr = (yamlKey ?? "").replace(/:$/, "");

      // Only remove if the key looks like a non-JSON key (schema-aware)
      const knownProperties = context.config?.knownProperties;
      if (!looksLikeNonJsonKey(keyStr, knownProperties)) {
        return null;
      }

      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const yamlKey = (groups[2] ?? "").substring(0, 30);
      return `Removed YAML value block: ${yamlKey}`;
    },
  },

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

  // Rule: Remove generic stray text on its own line between JSON elements
  // Pattern: `],\ntrib\n  "property":` -> `],\n  "property":`
  {
    name: "genericStrayTextLine",
    pattern: /([}\],])\s*\n\s*([a-zA-Z_][a-zA-Z0-9_-]{1,30})\s*\n(\s*"|\s*[}\]])/g,
    replacement: (_match, groups) => {
      const strayText = groups[1] ?? "";
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
      const [delimiter, , continuation] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = continuation ?? "";
      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = groups[1] ?? "";
      return `Removed stray text '${strayText}'`;
    },
  },

  // Rule: Remove sentence-like text before properties
  // Pattern: `],\nthere are more methods, but...\n  "property":` -> `],\n  "property":`
  {
    name: "sentenceLikeTextBeforeProperty",
    pattern: /([}\],])\s*\n\s*([a-z][a-z\s,.'!?-]{10,60})\s*\n(\s*"[a-zA-Z_$])/gi,
    replacement: (_match, groups) => {
      const sentenceText = (groups[1] ?? "").trim();
      // Check if it looks like a sentence (contains spaces, doesn't look like JSON)
      if (!sentenceText.includes(" ") || sentenceText.length <= 10) {
        return null;
      }
      const [delimiter, , continuation] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = continuation ?? "";
      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const sentenceText = (groups[1] ?? "").trim().substring(0, 30);
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

      const strayText = (groups[1] ?? "").trim();

      // Use structural detection: check if it looks like sentence-like content
      if (!looksLikeSentenceStructure(strayText)) {
        return null;
      }

      const [delimiter, , nextChar] = groups;
      const delimiterStr = delimiter ?? "";
      const nextCharStr = nextChar ?? "";
      return `${delimiterStr}\n${nextCharStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = (groups[1] ?? "").trim();
      return `Removed stray text: "${strayText}"`;
    },
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

  // Rule: Remove invalid property blocks (extra_*, _llm_*, _ai_*)
  // Pattern: `extra_code_analysis: {` -> remove entire property block
  {
    name: "invalidPropertyBlock",
    pattern: /([}\],]|\n|^)(\s*)((?:extra_|_llm_|_ai_)[a-z_]+):\s*{/gi,
    replacement: (_match, groups, context) => {
      // This is a complex pattern that needs to find the matching closing brace
      // For the rule-based system, we'll handle simple cases
      // The main sanitizer will handle complex nested cases
      const { fullContent, offset } = context;
      const matchStr = _match;

      // Find matching closing brace
      let braceCount = 1;
      let i = offset + matchStr.length;

      while (i < fullContent.length && braceCount > 0) {
        const char = fullContent[i];
        if (char === "\\") {
          i += 2;
          continue;
        }
        if (char === '"') {
          i++;
          while (i < fullContent.length && fullContent[i] !== '"') {
            if (fullContent[i] === "\\") {
              i += 2;
            } else {
              i++;
            }
          }
          i++;
          continue;
        }
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
        }
        i++;
      }

      // If we couldn't find the closing brace, skip this replacement
      if (braceCount !== 0) {
        return null;
      }

      const [delimiter, whitespace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";

      // Return the replacement that will remove the entire block
      // Note: This only works for simple cases; complex nested cases
      // need the full sanitizer logic
      return `${delimiterStr}${whitespaceStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const invalidProp = groups[2] ?? "";
      return `Removed invalid property block: ${invalidProp}`;
    },
    skipInString: true,
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
      const [delimiter, whitespace, , propertyWithQuote] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyWithQuoteStr = propertyWithQuote ?? "";
      return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const configText = groups[2] ?? "";
      const propertyWithQuote = groups[3] ?? "";
      return `Removed config text '${configText}' before property: ${propertyWithQuote}`;
    },
  },
];
