/**
 * Strategy for removing text that appears outside JSON string values.
 * Handles LLM commentary, descriptive text, and stray text in JSON structures.
 * Uses generic structural pattern detection for schema-agnostic processing.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";
import { DiagnosticCollector } from "../../utils/diagnostic-collector";
import { JSON_KEYWORDS_SET, processingConfig } from "../../constants/json-processing.config";

/**
 * Checks if a word looks like stray text that shouldn't appear before JSON properties.
 * Uses generic structural detection rather than hardcoded word lists:
 * 1. JSON keywords (true, false, null) are never stray
 * 2. Short lowercase words (2-10 chars) in structural context are likely stray
 *
 * @param word - The word to check
 * @returns True if the word looks like stray text that should be removed
 */
function looksLikeStrayText(word: string): boolean {
  const lowerWord = word.toLowerCase();

  // JSON keywords should never be removed
  if (JSON_KEYWORDS_SET.has(lowerWord)) {
    return false;
  }

  // Short lowercase words (2-10 chars) appearing between structural delimiters
  // and property names are almost always stray LLM filler text
  if (/^[a-z]{2,10}$/.test(word)) {
    return true;
  }

  return false;
}

/**
 * Checks if a property name looks like an LLM artifact or internal property.
 *
 * @param propertyName - The property name to check
 * @returns True if the property looks like an LLM artifact
 */
function isLLMArtifactOrInternalProperty(propertyName: string): boolean {
  // Match patterns: extra_*, llm_*, ai_*, _*, codeSmells, or anything ending with _thoughts/_text/_notes
  return (
    /^(extra|llm|ai)_[a-z_]+$/i.test(propertyName) ||
    /^_[a-z_]+$/i.test(propertyName) ||
    /^codeSmells$/i.test(propertyName) ||
    /_(thoughts?|text|notes?|info|reasoning|analysis)$/i.test(propertyName)
  );
}

/**
 * Strategy that removes text appearing outside JSON string values.
 */
export const textOutsideJsonRemover: SanitizerStrategy = {
  name: "TextOutsideJsonRemover",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics = new DiagnosticCollector(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY);
    let hasChanges = false;

    // Pattern 1: Text appearing after closing quote
    const textOutsideStringPattern =
      /"([^"]+)"\s*,\s*\n\s*([a-z][^"]{5,200}?)(?=\s*[,}\]]|\s*\n\s*"[a-zA-Z]|\.\s*$)/g;
    sanitized = sanitized.replace(
      textOutsideStringPattern,
      (match, value, strayText, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const looksLikeDescriptiveText =
          (/\b(the|a|an|is|are|was|were|this|that|from|to|for|with|by|in|on|at|suggests|pattern|use|layer|thought|user|wants|act|senior|developer|analyze|provided|java|code|produce|json|output|conforms|specified|schema|since|as|when|where|while|if|although|though|because)\b/i.test(
            strayTextStr,
          ) ||
            /^[a-z][a-z\s]{5,50}\.$/i.test(strayTextStr)) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (looksLikeDescriptiveText) {
          hasChanges = true;
          const valueStr = typeof value === "string" ? value : "";
          const truncated =
            strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
          diagnostics.add(`Removed descriptive text: "${valueStr}" + "${truncated}"`);
          return `"${valueStr}",`;
        }

        return match;
      },
    );

    // Pattern 2: Text between closing brace and next structure
    const strayTextPattern = /([}\]])\s*,\s*\n\s*([a-z\s]{2,50})\n\s*([{"])/g;
    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, strayText, nextToken, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        const isStrayText =
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]") &&
          !/^\s*(true|false|null|undefined)\s*$/.test(strayTextStr);

        if (isStrayText) {
          hasChanges = true;
          diagnostics.add(`Removed stray text: "${strayTextStr.trim()}"`);
          return `${delimiterStr},\n    ${nextTokenStr}`;
        }

        return match;
      },
    );

    // Pattern 3: Text after JSON structure ends
    const textAfterJsonEndPattern = /(}\s*)\n\s*([a-z][a-z\s]{5,200}?)(\.|\.\.\.|!|\?)?\s*$/i;
    sanitized = sanitized.replace(
      textAfterJsonEndPattern,
      (match, closingBrace, strayText, _punctuation, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";

        const looksLikeDescriptiveText =
          /\b(so\s+many|I\s+will|I\s+shall|stop|here|methods|continue|proceed|skip|ignore|let\s+me|I\s+can|I\s+should|I\s+must|I\s+need|I\s+want|I\s+think|I\s+believe|I\s+see|I\s+notice|I\s+observe)\b/i.test(
            strayTextStr,
          ) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (looksLikeDescriptiveText) {
          hasChanges = true;
          const displayText =
            strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
          diagnostics.add(`Removed text after JSON structure: "${displayText}"`);
          return closingBraceStr;
        }

        return match;
      },
    );

    // Pattern 4: LLM thought/metadata markers (both quoted and unquoted)
    // Generic pattern catches _llm_*, _ai_*, *_thought(s), *_reasoning, etc.
    const llmThoughtPattern =
      /(}\s*)\n\s*"?(?:_?(?:llm|ai)_[a-z_]+|[a-z_]*_thoughts?|[a-z_]*_reasoning)"?\s*:.*$/is;
    sanitized = sanitized.replace(llmThoughtPattern, (match, closingBrace, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
      hasChanges = true;
      diagnostics.add("Removed LLM thought/metadata text after JSON structure");
      return closingBraceStr;
    });

    // Pattern 5: LLM mid-JSON commentary
    const llmMidJsonCommentaryPattern =
      /([,}\]])\s*\n\s*(Next,?\s+I\s+will|Let\s+me\s+(?:analyze|continue|proceed|now)|I\s+(?:will|shall)\s+(?:now|next)|Now\s+(?:let|I)|Moving\s+on)[^"]*?\n(\s*")/gi;
    sanitized = sanitized.replace(
      llmMidJsonCommentaryPattern,
      (match, delimiter, _commentary, nextQuote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextQuoteStr = typeof nextQuote === "string" ? nextQuote : "";

        hasChanges = true;
        diagnostics.add("Removed LLM mid-JSON commentary");
        return `${delimiterStr}\n${nextQuoteStr}`;
      },
    );

    // Pattern 6: Continuation text
    const continuationTextPattern = /to\s+be\s+conti[nued]*\.\.\.?\s*/gi;
    sanitized = sanitized.replace(continuationTextPattern, (match, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      hasChanges = true;
      diagnostics.add("Removed 'to be continued...' text");
      return "";
    });

    // Pattern 7: Stray short text before property name after closing brace
    // e.g., "}, so    "connectionInfo" -> "}, "connectionInfo"
    // Generic pattern catches any short filler word (2-10 chars) before properties
    const strayTextBeforePropertyPattern = /([}\]],)\s*\n\s*([a-z]{2,10})\s+(")/gi;
    sanitized = sanitized.replace(
      strayTextBeforePropertyPattern,
      (match, delimiter, strayWord, quote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayWordStr = typeof strayWord === "string" ? strayWord : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const quoteStr = typeof quote === "string" ? quote : "";

        // Use generic structural detection for stray text
        if (looksLikeStrayText(strayWordStr)) {
          hasChanges = true;
          diagnostics.add(`Removed stray word '${strayWordStr}' before property`);
          return `${delimiterStr}\n    ${quoteStr}`;
        }

        return match;
      },
    );

    // Pattern 8: Corrupted text after closing brace/bracket (like },ce or e-12,)
    const corruptedTextPattern = /([}\]]),([a-z]{1,4}|\d{1,3}(?:-\d+)?),?\s*\n/gi;
    sanitized = sanitized.replace(
      corruptedTextPattern,
      (match, delimiter, corruptedText, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const corruptedTextStr = typeof corruptedText === "string" ? corruptedText : "";

        // Check if it looks like corrupted text (short alphabetic strings or numbers with dashes)
        if (/^[a-z]{1,4}$/i.test(corruptedTextStr) || /^\d{1,3}(-\d+)?$/.test(corruptedTextStr)) {
          hasChanges = true;
          diagnostics.add(`Removed corrupted text: '${corruptedTextStr}'`);
          return `${delimiterStr},\n`;
        }

        return match;
      },
    );

    // Pattern 9: Orphaned properties after corrupted text (remove the orphan)
    // e.g., "},\n      "codeSmells": []\n    }," -> "},"
    // Generic pattern catches any LLM artifact or internal property that appears orphaned
    const orphanedPropertyPattern =
      /([}\]]),\s*\n\s*"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:\s*\[[^\]]*\]\s*\n\s*\},/gi;
    sanitized = sanitized.replace(
      orphanedPropertyPattern,
      (match, delimiter, propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        // Only remove if it looks like an LLM artifact or internal property
        if (!isLLMArtifactOrInternalProperty(propertyNameStr)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";

        hasChanges = true;
        diagnostics.add(`Removed orphaned property '${propertyNameStr}' after corrupted structure`);
        return `${delimiterStr},`;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics: diagnostics.getAll(),
    };
  },
};
