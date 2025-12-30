/**
 * Strategy for removing text that appears outside JSON string values.
 * Handles LLM commentary, descriptive text, and stray text in JSON structures.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/** Maximum diagnostics to collect */
const MAX_DIAGNOSTICS = 20;

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
    const diagnostics: string[] = [];
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            const truncated = strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
            diagnostics.push(`Removed descriptive text: "${valueStr}" + "${truncated}"`);
          }
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed stray text: "${strayTextStr.trim()}"`);
          }
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
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            const displayText = strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
            diagnostics.push(`Removed text after JSON structure: "${displayText}"`);
          }
          return closingBraceStr;
        }

        return match;
      },
    );

    // Pattern 4: LLM thought markers (both quoted and unquoted)
    const llmThoughtPattern = /(}\s*)\n\s*"?_llm_thought"?\s*:.*$/s;
    sanitized = sanitized.replace(llmThoughtPattern, (match, closingBrace, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
      hasChanges = true;
      if (diagnostics.length < MAX_DIAGNOSTICS) {
        diagnostics.push("Removed _llm_thought text after JSON structure");
      }
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
        if (diagnostics.length < MAX_DIAGNOSTICS) {
          diagnostics.push("Removed LLM mid-JSON commentary");
        }
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
      if (diagnostics.length < MAX_DIAGNOSTICS) {
        diagnostics.push("Removed 'to be continued...' text");
      }
      return "";
    });

    // Pattern 7: Stray short text before property name after closing brace
    // e.g., "}, so    "connectionInfo" -> "}, "connectionInfo"
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

        // Common stray words that appear before properties
        const strayWords = ["so", "and", "but", "also", "then", "next", "now"];
        if (strayWords.includes(strayWordStr.toLowerCase())) {
          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed stray word '${strayWordStr}' before property`);
          }
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
        if (
          /^[a-z]{1,4}$/i.test(corruptedTextStr) ||
          /^\d{1,3}(-\d+)?$/.test(corruptedTextStr)
        ) {
          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed corrupted text: '${corruptedTextStr}'`);
          }
          return `${delimiterStr},\n`;
        }

        return match;
      },
    );

    // Pattern 9: Orphaned properties after corrupted text (remove the orphan)
    // e.g., "},\n      "codeSmells": []\n    }," -> "},"
    const orphanedPropertyPattern =
      /([}\]]),\s*\n\s*"(codeSmells|extra_\w+)"\s*:\s*\[[^\]]*\]\s*\n\s*\},/gi;
    sanitized = sanitized.replace(
      orphanedPropertyPattern,
      (match, delimiter, _propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";

        hasChanges = true;
        if (diagnostics.length < MAX_DIAGNOSTICS) {
          diagnostics.push("Removed orphaned property after corrupted structure");
        }
        return `${delimiterStr},`;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};

