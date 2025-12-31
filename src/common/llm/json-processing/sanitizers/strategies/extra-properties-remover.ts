/**
 * Strategy for removing LLM artifact properties from JSON.
 * These include extra_*, llm_*, ai_*, and _* prefixed properties that
 * are commonly added by LLMs as metadata or internal reasoning.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/**
 * Checks if a property name looks like an LLM artifact property.
 * Generic detection for extra_*, llm_*, ai_*, and _* prefixed properties.
 *
 * @param propertyName - The property name to check
 * @returns True if the property name looks like an LLM artifact
 */
function isLLMArtifactProperty(propertyName: string): boolean {
  const lowerName = propertyName.toLowerCase();
  // Match patterns: extra_*, llm_*, ai_*, _* (underscore prefix)
  // Also match common suffixes: *_thoughts, *_text, *_notes, *_info, *_reasoning, *_analysis
  return (
    /^(extra|llm|ai)_[a-z_]+$/i.test(propertyName) ||
    /^_[a-z_]+$/i.test(propertyName) ||
    /_(thoughts?|text|notes?|info|reasoning|analysis|comment|metadata)$/i.test(lowerName)
  );
}

/**
 * Strategy that removes LLM artifact properties like extra_thoughts, extra_text,
 * llm_notes, ai_reasoning, _internal_*, etc.
 */
export const extraPropertiesRemover: SanitizerStrategy = {
  name: "ExtraPropertiesRemover",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Pattern 1: Handle malformed LLM artifact properties like `extra_text="  "property":`
    // Generic pattern catches extra_*, llm_*, ai_* prefixed properties with malformed syntax
    const malformedArtifactPattern =
      /([,{])\s*((?:extra|llm|ai)_[a-z_]+)\s*=\s*"\s*"\s*([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:\s*)/gi;
    sanitized = sanitized.replace(
      malformedArtifactPattern,
      (match, delimiter, artifactProp, propertyNameWithQuote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const artifactPropStr = typeof artifactProp === "string" ? artifactProp : "";
        diagnostics.push(`Removed malformed ${artifactPropStr} property`);
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const propertyNameWithQuoteStr =
          typeof propertyNameWithQuote === "string" ? propertyNameWithQuote : "";
        const fixedProperty = `"${propertyNameWithQuoteStr}`;
        return `${delimiterStr}\n    ${fixedProperty}`;
      },
    );

    // Pattern 2: Handle unquoted LLM artifact properties
    // Generic pattern matches extra_*, llm_*, ai_*, _* prefixed properties
    const unquotedArtifactPropertyPattern = /([,{])\s*((?:extra|llm|ai)_[a-z_]+|_[a-z_]+)\s*:\s*/gi;
    let previousUnquoted = "";
    while (previousUnquoted !== sanitized) {
      previousUnquoted = sanitized;
      const matches: { start: number; end: number; delimiter: string; propName: string }[] = [];
      let match;
      const pattern = new RegExp(
        unquotedArtifactPropertyPattern.source,
        unquotedArtifactPropertyPattern.flags,
      );
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const propName = match[2] || "";
        // Validate it's an LLM artifact property
        if (!isLLMArtifactProperty(propName)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;
        let braceCount = 0;
        let bracketCount = 0;

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }

        if (valueEndPos >= sanitized.length) {
          continue;
        }

        const firstChar = sanitized[valueEndPos];
        if (firstChar === "{") {
          braceCount = 1;
          valueEndPos++;
          while (braceCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "{") {
                braceCount++;
              } else if (sanitized[valueEndPos] === "}") {
                braceCount--;
              }
            }
            valueEndPos++;
          }
        } else if (firstChar === '"') {
          inString = true;
          valueEndPos++;
          let foundClosingQuote = false;
          while (valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = false;
              foundClosingQuote = true;
              valueEndPos++;
              break;
            }
            valueEndPos++;
          }
          if (!foundClosingQuote) {
            const nextComma = sanitized.indexOf(",", valueStartPos);
            if (nextComma !== -1) {
              valueEndPos = nextComma + 1;
            } else {
              const nextNewline = sanitized.indexOf("\n", valueStartPos);
              if (nextNewline !== -1) {
                valueEndPos = nextNewline;
              }
            }
          }
        } else if (firstChar === "[") {
          bracketCount = 1;
          valueEndPos++;
          while (bracketCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "[") {
                bracketCount++;
              } else if (sanitized[valueEndPos] === "]") {
                bracketCount--;
              }
            }
            valueEndPos++;
          }
        } else {
          const nextComma = sanitized.indexOf(",", valueStartPos);
          if (nextComma !== -1) {
            valueEndPos = nextComma + 1;
          } else {
            continue;
          }
        }

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }
        if (valueEndPos < sanitized.length && sanitized[valueEndPos] === ",") {
          valueEndPos++;
        }

        matches.push({
          start: numericOffset,
          end: valueEndPos,
          delimiter: delimiterStr,
          propName,
        });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        let replacement = "";
        if (m.delimiter === ",") {
          replacement = "";
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push(`Removed unquoted LLM artifact property: ${m.propName}`);
      }
    }

    // Pattern 3: Handle quoted LLM artifact properties
    // Generic pattern matches "extra_*", "llm_*", "ai_*", "_*" prefixed properties
    const quotedArtifactPropertyPattern = /([,{])\s*"((?:extra|llm|ai)_[a-z_]+|_[a-z_]+)"\s*:\s*/gi;
    let previousExtraProperty = "";
    while (previousExtraProperty !== sanitized) {
      previousExtraProperty = sanitized;
      const matches: { start: number; end: number; delimiter: string; propName: string }[] = [];
      let match;
      const pattern = new RegExp(
        quotedArtifactPropertyPattern.source,
        quotedArtifactPropertyPattern.flags,
      );
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const propName = match[2] || "";
        // Validate it's an LLM artifact property
        if (!isLLMArtifactProperty(propName)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }

        if (valueEndPos >= sanitized.length) {
          continue;
        }

        const firstChar = sanitized[valueEndPos];

        if (firstChar === "{") {
          let braceCount = 1;
          valueEndPos++;
          while (braceCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "{") {
                braceCount++;
              } else if (sanitized[valueEndPos] === "}") {
                braceCount--;
              }
            }
            valueEndPos++;
          }
        } else if (firstChar === '"') {
          inString = true;
          valueEndPos++;
          while (inString && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = false;
            }
            valueEndPos++;
          }
          valueEndPos++;
        } else {
          continue;
        }

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }
        if (valueEndPos < sanitized.length && sanitized[valueEndPos] === ",") {
          valueEndPos++;
        }

        matches.push({
          start: numericOffset,
          end: valueEndPos,
          delimiter: delimiterStr,
          propName,
        });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        let replacement = "";
        if (m.delimiter === ",") {
          replacement = "";
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push(`Removed LLM artifact property: ${m.propName}`);
      }
    }

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};
