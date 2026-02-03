/**
 * Strategy for removing LLM artifact properties from JSON.
 * These include extra_*, llm_*, ai_*, and _* prefixed properties that
 * are commonly added by LLMs as metadata or internal reasoning.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { findJsonValueEnd, createStringBoundaryChecker } from "../../utils/parser-context-utils";

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
 * Checks if a property should be removed based on known properties list.
 * When knownProperties is provided and a property is not in that list,
 * and it looks like potential LLM-generated metadata, it should be removed.
 *
 * @param propertyName - The property name to check
 * @param knownProperties - Optional list of known valid property names
 * @returns True if the property should be removed
 */
function shouldRemoveUnknownProperty(
  propertyName: string,
  knownProperties: readonly string[] | undefined,
): boolean {
  // If no knownProperties provided, don't use this check
  if (!knownProperties || knownProperties.length === 0) {
    return false;
  }

  // Check if property is in the known list (case-insensitive)
  const lowerName = propertyName.toLowerCase();
  const isKnown = knownProperties.some((p) => p.toLowerCase() === lowerName);

  if (isKnown) {
    return false;
  }

  // Only remove unknown properties that look like potential LLM artifacts:
  // - Contains underscore (common in LLM-generated metadata like extra_info, _meta)
  // - Has a suspicious suffix (*_response, *_output, *_result)
  // - Starts with underscore (internal/hidden properties)
  return (
    /^_[a-z_]+$/i.test(propertyName) ||
    /[_-](response|output|result|data|info|meta|internal|private)$/i.test(propertyName) ||
    /^(extra|llm|ai|model|gpt|claude|gemini)[_-]/i.test(propertyName)
  );
}

/**
 * Represents a matched artifact property to be removed.
 */
interface ArtifactMatch {
  start: number;
  end: number;
  delimiter: string;
  propName: string;
}

/**
 * Configuration for processing artifact matches.
 */
interface ProcessMatchesConfig {
  /** Whether to use fallback (comma/newline) when value parsing fails */
  useFallbackOnParseFailure: boolean;
  /** Prefix for repair messages */
  repairMessagePrefix: string;
}

/**
 * Processes artifact property matches and removes them from the content.
 * This is a shared helper that consolidates the common while-loop pattern
 * used for both quoted and unquoted property removal.
 *
 * @param content - The JSON content to process
 * @param pattern - The regex pattern to match artifact properties
 * @param knownProperties - Optional list of known valid property names
 * @param config - Configuration for match processing
 * @returns Object containing sanitized content, repairs list, and hasChanges flag
 */
function processArtifactMatches(
  content: string,
  pattern: RegExp,
  knownProperties: readonly string[] | undefined,
  config: ProcessMatchesConfig,
): { sanitized: string; repairs: string[]; hasChanges: boolean } {
  let sanitized = content;
  const repairs: string[] = [];
  let hasChanges = false;
  let previousContent = "";

  while (previousContent !== sanitized) {
    previousContent = sanitized;
    // Recreate checker for each iteration since content may have changed
    const isInString = createStringBoundaryChecker(sanitized);
    const matches: ArtifactMatch[] = [];

    for (const match of sanitized.matchAll(pattern)) {
      const numericOffset = match.index;
      if (isInString(numericOffset)) {
        continue;
      }

      const propName = match[2] || "";
      // Validate it's an LLM artifact property or an unknown property that looks like metadata
      if (
        !isLLMArtifactProperty(propName) &&
        !shouldRemoveUnknownProperty(propName, knownProperties)
      ) {
        continue;
      }

      const delimiterStr = match[1] || "";
      const valueStartPos = numericOffset + match[0].length;

      // Use the shared utility to find the end of the JSON value
      const valueEndResult = findJsonValueEnd(sanitized, valueStartPos);
      let valueEndPos = valueEndResult.endPosition;

      // Handle parse failure based on configuration
      if (!valueEndResult.success) {
        if (config.useFallbackOnParseFailure) {
          // Try fallback to next comma or newline
          const nextComma = sanitized.indexOf(",", valueStartPos);
          if (nextComma !== -1) {
            valueEndPos = nextComma + 1;
          } else {
            const nextNewline = sanitized.indexOf("\n", valueStartPos);
            if (nextNewline !== -1) {
              valueEndPos = nextNewline;
            } else {
              continue;
            }
          }
        } else {
          // Skip this match if parsing failed and no fallback is allowed
          continue;
        }
      }

      // Skip trailing whitespace and comma
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

    // Process matches in reverse order to preserve string positions
    for (const m of matches.toReversed()) {
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
      repairs.push(`${config.repairMessagePrefix}${m.propName}`);
    }
  }

  return { sanitized, repairs, hasChanges };
}

/**
 * Strategy that removes LLM artifact properties like extra_thoughts, extra_text,
 * llm_notes, ai_reasoning, _internal_*, etc.
 *
 * When knownProperties is provided in the config, this strategy will also remove
 * properties that are not in the known list but look like LLM-generated metadata.
 */
export const extraPropertiesRemover: SanitizerStrategy = {
  name: "ExtraPropertiesRemover",

  apply(input: string, config?: LLMSanitizerConfig): StrategyResult {
    const knownProperties = config?.knownProperties;
    if (!input) {
      return { content: input, changed: false, repairs: [] };
    }

    let sanitized = input;
    const repairs: string[] = [];

    // Create cached string boundary checker for O(log N) lookups
    const isInString = createStringBoundaryChecker(sanitized);

    // Pattern 1: Handle malformed LLM artifact properties like `extra_text="  "property":`
    // Generic pattern catches extra_*, llm_*, ai_* prefixed properties with malformed syntax
    const malformedArtifactPattern =
      /([,{])\s*((?:extra|llm|ai)_[a-z_]+)\s*=\s*"\s*"\s*([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:\s*)/gi;
    const sanitizedAfterMalformed = sanitized.replace(
      malformedArtifactPattern,
      (match, delimiter, artifactProp, propertyNameWithQuote, offset: number) => {
        if (isInString(offset)) {
          return match;
        }

        const artifactPropStr = typeof artifactProp === "string" ? artifactProp : "";
        repairs.push(`Removed malformed ${artifactPropStr} property`);
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const propertyNameWithQuoteStr =
          typeof propertyNameWithQuote === "string" ? propertyNameWithQuote : "";
        const fixedProperty = `"${propertyNameWithQuoteStr}`;
        return `${delimiterStr}\n    ${fixedProperty}`;
      },
    );
    const malformedHasChanges = sanitizedAfterMalformed !== sanitized;
    sanitized = sanitizedAfterMalformed;

    // Pattern 2: Handle unquoted LLM artifact properties
    // Generic pattern matches extra_*, llm_*, ai_*, _* prefixed properties
    const unquotedArtifactPropertyPattern = /([,{])\s*((?:extra|llm|ai)_[a-z_]+|_[a-z_]+)\s*:\s*/gi;
    const unquotedResult = processArtifactMatches(
      sanitized,
      unquotedArtifactPropertyPattern,
      knownProperties,
      {
        useFallbackOnParseFailure: true,
        repairMessagePrefix: "Removed unquoted LLM artifact property: ",
      },
    );
    sanitized = unquotedResult.sanitized;
    repairs.push(...unquotedResult.repairs);

    // Pattern 3: Handle quoted LLM artifact properties
    // Generic pattern matches "extra_*", "llm_*", "ai_*", "_*" prefixed properties
    const quotedArtifactPropertyPattern = /([,{])\s*"((?:extra|llm|ai)_[a-z_]+|_[a-z_]+)"\s*:\s*/gi;
    const quotedResult = processArtifactMatches(
      sanitized,
      quotedArtifactPropertyPattern,
      knownProperties,
      {
        useFallbackOnParseFailure: false,
        repairMessagePrefix: "Removed LLM artifact property: ",
      },
    );
    sanitized = quotedResult.sanitized;
    repairs.push(...quotedResult.repairs);

    const hasChanges = malformedHasChanges || unquotedResult.hasChanges || quotedResult.hasChanges;

    return {
      content: sanitized,
      changed: hasChanges,
      repairs,
    };
  },
};
