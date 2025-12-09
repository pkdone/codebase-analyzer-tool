import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logOneLineWarning } from "../../../common/utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";
import { COMMON_PROPERTY_STARTS } from "../constants/schema-specific.constants";

/**
 * Heuristic sanitizer that fixes assorted malformed JSON patterns from LLM responses.
 *
 * This sanitizer uses generic, pattern-based fixes to handle various JSON errors:
 * 1. Duplicate/corrupted array entries (e.g., "extra.persistence.Version" after "jakarta.persistence.Version")
 * 2. Truncated property names (e.g., 'se":' -> '"purpose":') - uses generic pattern with schema-specific fallback
 * 3. Text appearing outside string values (e.g., descriptive text after closing quotes)
 * 4. Stray text in JSON structures (e.g., commentary between objects)
 * 5. Missing quotes after colons (e.g., '"name":isInterestTransfer":' -> '"name": "isInterestTransfer"')
 *
 * The patterns are designed to be more generic and catch variations, using:
 * - Character classes instead of specific word lists where possible
 * - Lookaheads/lookbehinds for context-aware matching
 * - Generic word boundary patterns for descriptive text detection
 * - Schema-agnostic property name detection with schema-specific fallback
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with heuristic fixes applied
 */
export const fixHeuristicJsonErrors: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // ===== Pattern 0: Fix property name typos (trailing underscores) =====
    // This MUST run early because property name typos prevent JSON parsing.
    // This is schema-agnostic - it fixes any property name ending with underscore(s)

    // Pattern 0a: Fix double underscores in property names FIRST (more specific)
    // Pattern: "name__": -> "name":
    const doubleUnderscorePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)__"\s*:/g;
    sanitized = sanitized.replace(
      doubleUnderscorePattern,
      (match, propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 150), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch) ||
          offset < 150;

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(
              `Fixed property name typo: "${propertyNameStr}__" -> "${propertyNameStr}"`,
            );
          }
          return `"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Pattern 0b: Fix single trailing underscore in property names
    // Pattern: "name_": or "type_": -> "name": or "type":
    // Note: Double underscores are handled by Pattern 0a above, so this only matches single underscores
    const trailingUnderscorePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)_"\s*:/g;
    sanitized = sanitized.replace(
      trailingUnderscorePattern,
      (match, propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (after comma, brace, newline, or start)
        const beforeMatch = sanitized.substring(Math.max(0, offset - 150), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch) ||
          offset < 150;

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(
              `Fixed property name typo: "${propertyNameStr}_" -> "${propertyNameStr}"`,
            );
          }
          return `"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 1: Remove duplicate/corrupted array entries =====
    // Pattern: "valid.entry",\n    corrupted.entry", or "valid.entry",\n    extra.entry",
    // where corrupted/extra entry is missing opening quote
    // Uses generic pattern to detect corruption markers (words that suggest duplication/corruption)
    const duplicateEntryPattern1 = /"([^"]+)"\s*,\s*\n\s*([a-z]+)\.[^"]*"\s*,/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern1,
      (match, validEntry, prefix, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in an array context and the prefix looks like a corruption marker
        const beforeMatch = sanitized.substring(Math.max(0, offset - 100), offset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
        const prefixStr = typeof prefix === "string" ? prefix : "";
        // Generic pattern: corruption markers are typically 4-10 letter words starting with common prefixes
        const looksLikeCorruptionMarker =
          /^(extra|duplicate|repeat|copy|another|second|third|additional|redundant|spurious)/i.test(
            prefixStr,
          );

        if (isInArrayContext && looksLikeCorruptionMarker) {
          hasChanges = true;
          const validEntryStr = typeof validEntry === "string" ? validEntry : "";
          diagnostics.push(
            `Removed duplicate/corrupted array entry starting with "${prefixStr}" after "${validEntryStr}"`,
          );
          return `"${validEntryStr}",`;
        }

        return match;
      },
    );

    // Pattern 1b: "valid.entry",\n    "corrupted.entry", where corrupted starts with corruption marker
    // Uses more generic pattern with word boundary to catch variations
    const duplicateEntryPattern2 =
      /"([^"]+)"\s*,\s*\n\s*"(extra|duplicate|repeat|copy|another|second|third|additional|redundant|spurious)[^"]*"(\s*,\s*|\s*\n)/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern2,
      (match, validEntry, prefix, delimiter, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 100), offset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);

        if (isInArrayContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          diagnostics.push(
            `Removed duplicate/corrupted array entry starting with "${prefix}" after "${validEntry}"`,
          );
          return `"${validEntry}"${delimiterStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 2: Fix truncated property names =====
    // Pattern: 'se":' or similar property name fragments followed by colon and value
    // This handles cases where the property name got truncated (e.g., "purpose" -> "se", "codeSmells" -> "alues")
    // Uses generic pattern: unquoted identifier before colon in property context
    // Schema-agnostic approach: quote the identifier and let validation catch invalid names
    const truncatedPropertyPattern = /(\s*)([a-z]{2,10})"\s*:\s*/g;

    sanitized = sanitized.replace(
      truncatedPropertyPattern,
      (match, whitespace, truncated, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if this looks like a property name context (after comma, brace, or newline)
        // Uses lookbehind-like logic: check preceding context
        const beforeMatch = sanitized.substring(Math.max(0, offset - 150), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /}\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch);

        const truncatedStr = typeof truncated === "string" ? truncated : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";

        // Generic approach: quote the truncated identifier
        // This is schema-agnostic - the identifier will be quoted and validation will catch invalid names
        // Schema-specific mappings are kept as fallback only for better diagnostics
        const fixedName = COMMON_PROPERTY_STARTS[truncatedStr];

        if (isPropertyContext) {
          hasChanges = true;
          if (fixedName) {
            // Use schema-specific mapping if available (better diagnostics)
            diagnostics.push(`Fixed truncated property name: "${truncatedStr}" -> "${fixedName}"`);
            return `${whitespaceStr}"${fixedName}": `;
          } else {
            // Generic fix: quote the truncated identifier
            // The validation step will catch if it's not a valid property name
            diagnostics.push(
              `Fixed truncated property name (generic): "${truncatedStr}" -> quoted identifier`,
            );
            return `${whitespaceStr}"${truncatedStr}": `;
          }
        }

        return match;
      },
    );

    // ===== Pattern 3: Remove text appearing outside string values =====
    // Pattern: "value",\n    text that appears after closing quote
    // This handles cases like: "lombok.RequiredArgsConstructor",\nfrom the API layer...
    // Enhanced to handle cases like: "value", tribulations.
    const textOutsideStringPattern =
      /"([^"]+)"\s*,\s*\n\s*([a-z][^"]{5,200}?)(?=\s*[,}\]]|\s*\n\s*"[a-zA-Z]|\.\s*$)/g;
    sanitized = sanitized.replace(
      textOutsideStringPattern,
      (match, value, strayText, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if the stray text looks like descriptive text (not JSON structure)
        // Generic pattern: text containing common English words (articles, prepositions, verbs)
        // or ending with period, and not containing JSON structure characters
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
          diagnostics.push(
            `Removed descriptive text outside string: "${valueStr}" + "${strayTextStr.substring(0, 50)}..."`,
          );
          return `"${valueStr}",`;
        }

        return match;
      },
    );

    // Pattern 3b: Handle text appearing after string values with punctuation
    // Pattern: "value", tribulations. -> "value",
    const textAfterStringWithPunctuationPattern =
      /"([^"]+)"\s*,\s*([a-z][a-z\s]{5,50}\.)\s*([,}\]]|\n|$)/g;
    sanitized = sanitized.replace(
      textAfterStringWithPunctuationPattern,
      (match, value, strayText, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const valueStr = typeof value === "string" ? value : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Check if it looks like descriptive text ending with a period
        if (
          /^[a-z][a-z\s]{5,50}\.$/i.test(strayTextStr) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]")
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed descriptive text after string value: "${valueStr}", ${strayTextStr}`,
          );
          // If terminator is empty or newline, use closing bracket for array context
          if (terminatorStr === "" || terminatorStr === "\n") {
            // Check if we're in an array context
            const beforeMatch = sanitized.substring(Math.max(0, offset - 50), offset);
            if (/\[\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch)) {
              return `"${valueStr}"\n  ]`;
            }
          }
          return `"${valueStr}",${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 4: Remove stray text like "so many" =====
    // Pattern: },\n    stray text\n    {
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

        // Check if it's clearly stray text (not JSON keywords or structure)
        const isStrayText =
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]") &&
          !/^\s*(true|false|null|undefined)\s*$/.test(strayTextStr);

        if (isStrayText) {
          hasChanges = true;
          diagnostics.push(`Removed stray text: "${strayTextStr.trim()}"`);
          return `${delimiterStr},\n    ${nextTokenStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 4b: Remove text appearing after JSON structure ends =====
    // Pattern: }\n    so many methods... I will stop here.
    // This handles cases where text appears after the final closing brace
    // Also handles: },\n    so many me
    const textAfterJsonEndPattern = /(}\s*)\n\s*([a-z][a-z\s]{5,200}?)(\.|\.\.\.|!|\?)?\s*$/i;
    sanitized = sanitized.replace(
      textAfterJsonEndPattern,
      (match, closingBrace, strayText, _punctuation, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";

        // Check if it looks like descriptive text (contains common commentary words/phrases)
        // Generic pattern: matches common commentary patterns (first person, continuation markers, etc.)
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
          diagnostics.push(`Removed text after JSON structure: "${displayText}"`);
          return closingBraceStr;
        }

        return match;
      },
    );

    // Pattern 4c: Remove text appearing after JSON structure in the middle (like "so many me" after a closing brace)
    // Pattern: },\n    so many me
    const textAfterJsonMiddlePattern = /(}\s*)\s*,\s*\n\s*([a-z][a-z\s]{2,50}?)(?=\s*[}\]]|$)/i;
    sanitized = sanitized.replace(
      textAfterJsonMiddlePattern,
      (match, closingBrace, strayText, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";

        // Check if it looks like descriptive text
        const looksLikeDescriptiveText =
          /\b(so\s+many|I\s+will|stop|here|methods|continue|proceed|skip|ignore)\b/i.test(
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
          diagnostics.push(`Removed text after JSON structure: "${displayText}"`);
          return closingBraceStr;
        }

        return match;
      },
    );

    // Pattern 4d: Remove text like "_llm_thought:" appearing after JSON structure
    // Pattern: }\n_llm_thought: The user wants...
    const llmThoughtPattern = /(}\s*)\n\s*_llm_thought\s*:.*$/s;
    sanitized = sanitized.replace(llmThoughtPattern, (match, closingBrace, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
      hasChanges = true;
      diagnostics.push("Removed _llm_thought text after JSON structure");
      return closingBraceStr;
    });

    // Pattern 4e: Remove text like "so    "connectionInfo":" appearing after closing brace
    // Pattern: },\n    so    "connectionInfo": or },\nso    "connectionInfo":
    const textBeforePropertyAfterBracePattern =
      /(}\s*)\s*,\s*\n\s*([a-z]{1,3})\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      textBeforePropertyAfterBracePattern,
      (match, closingBrace, strayText, propertyWithQuote, _propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyWithQuoteStr = typeof propertyWithQuote === "string" ? propertyWithQuote : "";

        // Check if it's a short word that looks like stray text
        // Generic pattern: 1-3 letter words that aren't common English words
        // Note: "so" is removed from exclusion list as it's often stray text in JSON context
        if (
          /^[a-z]{1,3}$/i.test(strayTextStr) &&
          !/^(the|and|for|are|was|were|but|not|nor|yet|all|any|can|may|has|had|did|got|put|set|let|get|run|say|see|use|try|ask|end|own|way|day|man|new|old|big|low|few|one|two|ten)$/i.test(
            strayTextStr,
          )
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed stray text '${strayTextStr}' before property after closing brace: ${strayTextStr} ${propertyWithQuoteStr}`,
          );
          return `${closingBraceStr},\n    ${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 5: Fix missing quotes after colons =====
    // Pattern: "name":isInterestTransfer": "boolean" -> "name": "isInterestTransfer",
    // The structure is: propertyName:unquotedValue": "nextPropertyValue"
    // This should become: propertyName: "unquotedValue",
    // Note: The "nextPropertyValue" appears to be orphaned and will be handled by subsequent sanitizers
    const missingQuoteAfterColonPattern =
      /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingQuoteAfterColonPattern,
      (match, propertyName, unquotedValue, _nextValue, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";

        // Check if this looks like a property value (not a JSON keyword)
        const jsonKeywords = ["true", "false", "null", "undefined"];
        if (!jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          hasChanges = true;
          diagnostics.push(
            `Fixed missing quote after colon: "${propertyNameStr}":${unquotedValueStr}" -> "${propertyNameStr}": "${unquotedValueStr}"`,
          );
          // The pattern is: "name":isInterestTransfer": "boolean"
          // This should become: "name": "isInterestTransfer",
          // The "boolean" part will be cleaned up by subsequent sanitizers or may need manual fixing
          // For now, we just fix the immediate issue
          return `"${propertyNameStr}": "${unquotedValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 6: Fix text after property values (e.g., "is nullable") =====
    // Pattern: "type": "Long"\n    is nullable"\n    "nextProperty": -> "type": "Long",
    const textAfterValuePattern1 =
      /"([^"]+)"\s*:\s*"([^"]+)"\s*\n\s*([a-z\s]+)"\s*\n\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      textAfterValuePattern1,
      (match, prop1, value1, strayText, prop2, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const prop1Str = typeof prop1 === "string" ? prop1 : "";
        const value1Str = typeof value1 === "string" ? value1 : "";
        const prop2Str = typeof prop2 === "string" ? prop2 : "";

        // Check if stray text looks like a comment/annotation (e.g., "is nullable")
        if (
          /^(is|are|was|were|can|should|must|may)\s+[a-z]+/i.test(strayTextStr) ||
          strayTextStr.toLowerCase().includes("nullable")
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed annotation text after property value: "${prop1Str}": "${value1Str}" + "${strayTextStr}"`,
          );
          return `"${prop1Str}": "${value1Str}",\n    "${prop2Str}":`;
        }

        return match;
      },
    );

    // ===== Pattern 7: Remove stray text in arrays (e.g., "from ...", "because it ...") =====
    // Pattern: `"value",\nfrom "org.apache..."` -> `"value",\n    "org.apache...",`
    // Also handles: `"value",\nbecause it is a private..."org.apache..."` -> `"value",\n    "org.apache...",`
    // Generic pattern: matches common preposition/conjunction words that start descriptive text
    const strayTextInArrayPattern =
      /"([^"]+)"\s*,\s*\n\s*\b(from|because|since|as|when|where|while|if|although|though|after|before|during|through|until|unless|provided|given|considering|regarding)\b\s+[^"]{10,200}?"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextInArrayPattern,
      (match, value1, _strayPrefix, value2, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          diagnostics.push(`Removed stray text in array between "${value1Str}" and "${value2Str}"`);
          return `"${value1Str}",\n    "${value2Str}",`;
        }

        return match;
      },
    );

    // Pattern 7b: Handle stray text at end of array elements
    // Pattern: `"value",\nfrom "org.apache..."` -> `"value",\n    "org.apache..."` (when it's the last element)
    const strayTextAtEndOfArrayElementPattern =
      /"([^"]+)"\s*,\s*\n\s*\b(from|because|since|as|when|where|while|if|although|though|after|before|during|through|until|unless|provided|given|considering|regarding)\b\s+[^"]{10,200}?"([^"]+)"\s*(\n\s*[}\],])/g;
    sanitized = sanitized.replace(
      strayTextAtEndOfArrayElementPattern,
      (match, value1, _strayPrefix, value2, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          diagnostics.push(
            `Removed stray text in array and preserved both values: "${value1Str}" and "${value2Str}"`,
          );
          return `"${value1Str}",\n    "${value2Str}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 7c: Handle stray text that ends with a quote but isn't a valid array element
    // Pattern: `"value",\nbecause it is a private inner class and not a public method.",\n    "nextValue",`
    // This handles cases where the stray text ends with a quote and comma, but isn't a valid JSON string
    const strayTextWithQuotePattern =
      /"([^"]+)"\s*,\s*\n\s*\b(from|because|since|as|when|where|while|if|although|though|after|before|during|through|until|unless|provided|given|considering|regarding)\b\s+[^"]{10,200}?"\s*,\s*\n\s*"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextWithQuotePattern,
      (match, value1, _strayPrefix, value2, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          diagnostics.push(
            `Removed stray text with quote in array between "${value1Str}" and "${value2Str}"`,
          );
          return `"${value1Str}",\n    "${value2Str}",`;
        }

        return match;
      },
    );

    // Pattern 6b: "type": "Long"\n    "is nullable" -> "type": "Long",
    const textAfterValuePattern2 =
      /"([^"]+)"\s*:\s*"([^"]+)"\s*\n\s*"([^"]+)"\s*,\s*\n\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      textAfterValuePattern2,
      (match, prop1, value1, strayText, prop2, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const prop1Str = typeof prop1 === "string" ? prop1 : "";
        const value1Str = typeof value1 === "string" ? value1 : "";
        const prop2Str = typeof prop2 === "string" ? prop2 : "";

        // Check if stray text looks like a comment/annotation
        if (
          /^(is|are|was|were|can|should|must|may)\s+[a-z]+/i.test(strayTextStr) ||
          strayTextStr.toLowerCase().includes("nullable")
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed annotation text after property value: "${prop1Str}": "${value1Str}" + "${strayTextStr}"`,
          );
          return `"${prop1Str}": "${value1Str}",\n    "${prop2Str}":`;
        }

        return match;
      },
    );

    // ===== Pattern 8: Fix missing opening quotes before property names =====
    // Pattern: `cyclomaticComplexity":` -> `"cyclomaticComplexity":`
    // This handles cases where a full property name is missing its opening quote
    // Enhanced to handle cases where property appears after quoted string values or newlines
    const missingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*/g;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, whitespace, propertyName, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (after comma, brace, newline, quoted string, or start of object)
        const beforeMatch = sanitized.substring(Math.max(0, offset - 150), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch) ||
          offset < 150;

        // Check if there's already a quote before this (shouldn't match if quote exists)
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyStart = offset + whitespaceStr.length;
        if (propertyStart > 0 && sanitized[propertyStart - 1] === '"') {
          return match;
        }

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          hasChanges = true;
          diagnostics.push(
            `Fixed missing opening quote before property: ${propertyNameStr}" -> "${propertyNameStr}"`,
          );
          return `${whitespaceStr}"${propertyNameStr}": `;
        }

        return match;
      },
    );

    // ===== Pattern 9: Remove corrupted text like "},ce" or "e-12," =====
    // Pattern: `},ce` or `},e-12,` -> `},`
    // Also handles `e-12,` on its own line
    // Enhanced to handle cases with newlines: `},\n    ce` or `},\nce`
    // Pattern 9a: Original pattern for corrupted text without orphaned property
    const corruptedTextPattern1 = /([},])(\s*\n?\s*)([a-z]{1,2})(-\d+)?\s*([,}\]]|\n|$)/g;
    // Pattern 9a-orphaned: Handles corrupted text with orphaned property: `e-12,\n    "codeSmells": []\n    }`
    const corruptedTextPattern1Orphaned =
      /([},])(\s*\n?\s*)([a-z]{1,2})(-\d+)?\s*,\s*\n\s*("codeSmells"\s*:\s*\[\s*\]\s*,?\s*\n\s*)([},]|\n|$)/g;
    // Pattern 9a-orphaned: Handle corrupted text with orphaned property first (more specific)
    sanitized = sanitized.replace(
      corruptedTextPattern1Orphaned,
      (
        match,
        delimiter,
        whitespace,
        chars,
        number,
        orphanedProperty,
        terminator,
        offset: number,
      ) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if this looks like corrupted text (1-2 lowercase letters followed by optional dash-number)
        const charsStr = typeof chars === "string" ? chars : "";
        const numberStr = typeof number === "string" ? number : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const orphanedPropertyStr = typeof orphanedProperty === "string" ? orphanedProperty : "";

        // Only match if it's 1-2 lowercase letters (not part of a longer word)
        // Also check that the terminator is valid (comma, closing brace/bracket, newline, or end)
        if (
          /^[a-z]{1,2}$/.test(charsStr) &&
          (numberStr === "" || /^-\d+$/.test(numberStr)) &&
          /^([,}\]]|\n|$)/.test(terminatorStr)
        ) {
          hasChanges = true;
          if (orphanedPropertyStr) {
            diagnostics.push(
              `Removed corrupted text ${charsStr}${numberStr} and orphaned property: ${orphanedPropertyStr.trim()}`,
            );
          } else {
            diagnostics.push(
              `Removed corrupted text: ${delimiterStr}${whitespaceStr}${charsStr}${numberStr} -> ${delimiterStr}`,
            );
          }
          // If we have an orphaned property and terminator is }, handle the replacement
          if (orphanedPropertyStr && terminatorStr === "}") {
            // If delimiter is just comma, the method object before already has },
            // Check what comes after - if it's `,\n    {`, we need to remove the comma from after
            // For now, return just newline - the comma from }, is already there
            if (delimiterStr === ",") {
              // Check the content after the match to see if we need to handle the following comma
              const afterMatch = sanitized.substring(offset + match.length);
              if (afterMatch.trim().startsWith(",")) {
                // Next structure starts with comma, return newline to connect structures
                return "\n    ";
              }
              return ",\n    ";
            }
            // If delimiter ends with }, return },
            if (delimiterStr.endsWith("}")) {
              return "},\n    ";
            }
          }
          // If terminator is newline or empty and we're before an object/array, keep the structure
          if ((terminatorStr === "\n" || terminatorStr === "") && whitespaceStr.includes("\n")) {
            return `${delimiterStr}${whitespaceStr}`;
          }
          // If delimiter already ends with comma and terminator is also comma, don't add another comma
          if (delimiterStr.endsWith(",") && terminatorStr === ",") {
            return delimiterStr;
          }
          return `${delimiterStr}${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 9a: Handle corrupted text without orphaned property (original pattern)
    sanitized = sanitized.replace(
      corruptedTextPattern1,
      (match, delimiter, whitespace, chars, number, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Check if this looks like corrupted text (1-2 lowercase letters followed by optional dash-number)
        const charsStr = typeof chars === "string" ? chars : "";
        const numberStr = typeof number === "string" ? number : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";

        // Only match if it's 1-2 lowercase letters (not part of a longer word)
        // Also check that the terminator is valid (comma, closing brace/bracket, newline, or end)
        if (
          /^[a-z]{1,2}$/.test(charsStr) &&
          (numberStr === "" || /^-\d+$/.test(numberStr)) &&
          /^([,}\]]|\n|$)/.test(terminatorStr)
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed corrupted text: ${delimiterStr}${whitespaceStr}${charsStr}${numberStr} -> ${delimiterStr}`,
          );
          // If terminator is newline or empty and we're before an object/array, keep the structure
          if ((terminatorStr === "\n" || terminatorStr === "") && whitespaceStr.includes("\n")) {
            return `${delimiterStr}${whitespaceStr}`;
          }
          // If delimiter already ends with comma and terminator is also comma, don't add another comma
          if (delimiterStr.endsWith(",") && terminatorStr === ",") {
            return delimiterStr;
          }
          return `${delimiterStr}${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 9b: Handle corrupted text on its own line like `e-12,` or after `},`
    // Enhanced to also handle orphaned properties that follow (like `"codeSmells": []`)
    const corruptedTextPattern2 =
      /([},]\s*\n\s*|\n\s*)([a-z]{1,2})(-\d+)?\s*,\s*\n\s*("codeSmells"\s*:\s*\[\s*\]\s*,?\s*\n\s*)([},])/g;
    sanitized = sanitized.replace(
      corruptedTextPattern2,
      (match, prefix, chars, number, orphanedProperty, _terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const charsStr = typeof chars === "string" ? chars : "";
        const numberStr = typeof number === "string" ? number : "";
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const orphanedPropertyStr = typeof orphanedProperty === "string" ? orphanedProperty : "";

        if (/^[a-z]{1,2}$/.test(charsStr) && (numberStr === "" || /^-\d+$/.test(numberStr))) {
          hasChanges = true;
          if (orphanedPropertyStr) {
            diagnostics.push(
              `Removed corrupted text ${charsStr}${numberStr} and orphaned property: ${orphanedPropertyStr.trim()}`,
            );
          } else {
            diagnostics.push(`Removed corrupted text: ${charsStr}${numberStr}`);
          }
          // Handle the replacement: remove corrupted text and orphaned property
          // The pattern matches: prefix + corrupted + orphaned + terminator
          // We want to return just the prefix (which maintains the structure)
          const prefixTrimmed = prefixStr.trim();
          // If prefix ends with }, we want to keep it and add proper spacing
          if (prefixTrimmed.endsWith("}")) {
            return `${prefixTrimmed}\n    `;
          }
          // If prefix is just comma, return it with newline
          if (prefixTrimmed === ",") {
            return ",\n    ";
          }
          // Default: return prefix as-is
          return prefixStr;
        }

        return match;
      },
    );

    // Pattern 9c: Remove orphaned properties that appear after corrupted text was removed
    // This runs after Pattern 9a/9b to clean up any orphaned properties left behind
    // Pattern: `},\n      "codeSmells": []\n    },\n    {` -> `},\n    {`
    // Only match orphaned properties that appear between a closing brace+comma and another structure
    const orphanedPropertyAfterCorruptionPattern =
      /(}\s*,\s*\n\s*)("codeSmells"\s*:\s*\[\s*\]\s*,?\s*\n\s*)(},\s*\n\s*{)/g;
    sanitized = sanitized.replace(
      orphanedPropertyAfterCorruptionPattern,
      (match, _prefix, _orphanedProperty, _suffix, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // This pattern specifically matches: }, + orphaned property + },
        // Replace with: },
        hasChanges = true;
        diagnostics.push("Removed orphaned property after corrupted text removal");
        // Return },\n    { to connect the closing method object with the next method
        return "},\n    {";
      },
    );

    // ===== Pattern 9d: Remove markdown list prefixes before JSON properties =====
    // Pattern: ` - "property":` or `- "purpose":` where markdown list markers appear before JSON properties
    // This handles cases where LLMs output markdown-style lists within JSON content
    const markdownListPrefixPattern = /([\s\n])[ \t]*-[ \t]+("?[a-zA-Z_$][a-zA-Z0-9_$]*"?\s*:)/g;
    sanitized = sanitized.replace(
      markdownListPrefixPattern,
      (match, precedingWhitespace, propertyWithColon, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const precedingStr = typeof precedingWhitespace === "string" ? precedingWhitespace : "";
        const propertyStr = typeof propertyWithColon === "string" ? propertyWithColon : "";

        hasChanges = true;
        diagnostics.push(`Removed markdown list prefix before property: - ${propertyStr}`);
        return `${precedingStr}${propertyStr}`;
      },
    );

    // ===== Pattern 9e: Remove LLM commentary phrases in middle of JSON =====
    // Pattern: `Next, I will analyze...` or `Let me continue...` appearing between JSON properties
    // These are common LLM self-commentary that should not be in JSON output
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
        diagnostics.push("Removed LLM mid-JSON commentary (Next, I will/Let me analyze/etc.)");
        return `${delimiterStr}\n${nextQuoteStr}`;
      },
    );

    // ===== Pattern 9f: Remove random text/filenames appearing between JSON properties =====
    // Pattern: `},\n  tribal-council-meeting-notes.md\n  "prop":` - random text/filenames between properties
    // This handles cases where LLMs insert random text that looks like filenames or identifiers
    const randomTextBetweenPropertiesPattern =
      /([}\]])\s*\n(\s*)([a-zA-Z][-a-zA-Z0-9_.]*\.(?:md|txt|json|js|ts|java|py|xml|html|css)|[a-zA-Z][-a-zA-Z0-9_]+[-][a-zA-Z0-9_-]+)\s*\n(\s*")/g;
    sanitized = sanitized.replace(
      randomTextBetweenPropertiesPattern,
      (match, delimiter, _ws1, _randomText, nextPropWs, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextPropWsStr = typeof nextPropWs === "string" ? nextPropWs : "";

        hasChanges = true;
        diagnostics.push("Removed random text/filename between JSON properties");
        return `${delimiterStr},\n${nextPropWsStr}`;
      },
    );

    // ===== Pattern 9g: Fix concatenated text fragments like "instancetype" before property values =====
    // Pattern: `instancetype"org.apache...` -> `"org.apache...`
    // This handles cases where LLMs concatenate random identifiers with string values
    const concatenatedTextPattern =
      /([,{[]\s*\n?\s*)(instancetype|instancety|instance|instanc|instan|typename|typena|classname|classna)(")/gi;
    sanitized = sanitized.replace(
      concatenatedTextPattern,
      (match, prefix, _corruptedText, quote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const prefixStr = typeof prefix === "string" ? prefix : "";
        const quoteStr = typeof quote === "string" ? quote : "";

        hasChanges = true;
        diagnostics.push("Removed concatenated text fragment before string value");
        return `${prefixStr}${quoteStr}`;
      },
    );

    // ===== Pattern 9h: Remove short stray text (2-4 chars) appearing before property names =====
    // Pattern: `}\n    ano\n  "purpose":` -> `}\n  "purpose":`
    // Extended from Pattern 9a to handle 3-4 character stray text like "ano", "so", etc.
    const shortStrayTextBeforePropertyPattern =
      /([}\],])\s*\n(\s*)([a-z]{2,4})\s*\n(\s*"[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g;
    sanitized = sanitized.replace(
      shortStrayTextBeforePropertyPattern,
      (match, delimiter, _ws1, strayText, propertyPart, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyPartStr = typeof propertyPart === "string" ? propertyPart : "";

        // Only remove if it's a short word that isn't a JSON keyword
        const jsonKeywords = ["true", "false", "null"];
        if (!jsonKeywords.includes(strayTextStr.toLowerCase())) {
          hasChanges = true;
          diagnostics.push(`Removed short stray text "${strayTextStr}" before property`);
          return `${delimiterStr},\n${propertyPartStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 10: Remove "to be continued..." text and similar LLM commentary =====
    // Pattern: `to be continued...` or `to be conti...` appearing in JSON
    const continuationTextPattern = /to\s+be\s+conti[nued]*\.\.\.?\s*/gi;
    sanitized = sanitized.replace(continuationTextPattern, (match, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      hasChanges = true;
      diagnostics.push("Removed 'to be continued...' continuation text");
      return "";
    });

    // Pattern 10b: Remove LLM commentary text like "awesome, let's do this."
    // Pattern: Text like "awesome, let's do this." appearing between properties
    const llmCommentaryPattern = /([,}])\s*\n\s*([a-z][a-z\s,']{5,50}\.)\s*\n\s*"/gi;
    sanitized = sanitized.replace(
      llmCommentaryPattern,
      (match, delimiter, commentary, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const commentaryStr = typeof commentary === "string" ? commentary : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";

        // Check if it looks like commentary (contains common words like "awesome", "let's", "do", "this")
        if (
          /\b(awesome|let's|let us|do this|here we|ready|ok|sure|great|perfect)\b/i.test(
            commentaryStr,
          )
        ) {
          hasChanges = true;
          diagnostics.push("Removed LLM commentary text");
          return `${delimiterStr}\n  "`;
        }

        return match;
      },
    );

    // ===== Pattern 11a: Remove extra_keys with YAML-like syntax and other LLM markers =====
    // Pattern: `extra_keys:\n  - "extra_key"` - YAML-like syntax that should be removed
    const extraKeysYamlPattern = /([,{])\s*extra_keys\s*:\s*\n\s*-\s*"[^"]*"\s*\n/g;
    sanitized = sanitized.replace(extraKeysYamlPattern, (match, delimiter, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      hasChanges = true;
      diagnostics.push("Removed extra_keys property with YAML-like syntax");
      return delimiterStr;
    });

    // Pattern 11b: Remove LLM response markers like "extrai-response-marker"
    const llmMarkerPattern = /([,}])\s*\n\s*extra[a-z-]*\s*\n/g;
    sanitized = sanitized.replace(llmMarkerPattern, (match, delimiter, offset: number) => {
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      hasChanges = true;
      diagnostics.push("Removed LLM response marker");
      return `${delimiterStr}\n`;
    });

    // ===== Pattern 11: Remove extra_thoughts and extra_text properties =====
    // Pattern: `extra_thoughts: {` or `extra_text: "..."` or `extra_text="  "externalReferences": [` - these are LLM artifacts that should be removed
    // This pattern handles both object values and string values, removing the entire property
    // Also handles unquoted property names and malformed syntax like `extra_text="  "property":`
    // Pattern 11-pre: Handle malformed extra_text like `extra_text="  "externalReferences":` or `extra_text="  "xternalReferences":`
    // This handles cases where extra_text is followed by a property name that's missing its opening quote
    const malformedExtraTextPattern =
      /([,{])\s*extra_text\s*=\s*"\s*"\s*([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:\s*)/g;
    sanitized = sanitized.replace(
      malformedExtraTextPattern,
      (match, delimiter, propertyNameWithQuote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        hasChanges = true;
        diagnostics.push("Removed malformed extra_text property and fixed missing opening quote");
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const propertyNameWithQuoteStr =
          typeof propertyNameWithQuote === "string" ? propertyNameWithQuote : "";
        // Add the missing opening quote before the property name
        const fixedProperty = `"${propertyNameWithQuoteStr}`;
        // Return delimiter + the fixed property that follows
        return `${delimiterStr}\n    ${fixedProperty}`;
      },
    );

    // Pattern 11-pre2: Handle unquoted extra_thoughts/extra_text (runs before the main pattern)
    // This uses a simpler approach: find the comma after the property value and remove everything
    const unquotedExtraPropertyPattern = /([,{])\s*(extra_thoughts|extra_text)\s*:\s*/g;
    let previousUnquoted = "";
    while (previousUnquoted !== sanitized) {
      previousUnquoted = sanitized;
      const matches: { start: number; end: number; delimiter: string }[] = [];
      let match;
      const pattern = new RegExp(
        unquotedExtraPropertyPattern.source,
        unquotedExtraPropertyPattern.flags,
      );
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        // Find the next comma after the property value
        // This handles both well-formed and malformed values
        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;
        let braceCount = 0;
        let bracketCount = 0;

        // Skip whitespace
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
          // Try to parse the string, but if it's malformed, find the next comma
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
          // If malformed, find the next comma
          if (!foundClosingQuote) {
            const nextComma = sanitized.indexOf(",", valueStartPos);
            if (nextComma !== -1) {
              valueEndPos = nextComma + 1;
            } else {
              // No comma found, try to find end of line
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
          // Unknown value type, find next comma
          const nextComma = sanitized.indexOf(",", valueStartPos);
          if (nextComma !== -1) {
            valueEndPos = nextComma + 1;
          } else {
            continue;
          }
        }

        // Skip trailing comma if present
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
        });
      }

      // Remove matches in reverse order
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        // Clean up: if delimiter was a comma, we may need to adjust
        let replacement = "";
        if (m.delimiter === ",") {
          replacement = "";
          // Check if we need to add a comma before the next property
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          // Remove any trailing comma or whitespace after the property value
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push("Removed unquoted extra_thoughts/extra_text property");
      }
    }

    // Pattern 11: Handle quoted extra_thoughts/extra_text properties
    const extraPropertyPattern = /([,{])\s*"(extra_thoughts|extra_text)"\s*:\s*/g;
    let previousExtraProperty = "";
    while (previousExtraProperty !== sanitized) {
      previousExtraProperty = sanitized;
      const matches: { start: number; end: number; delimiter: string }[] = [];
      let match;
      const pattern = new RegExp(extraPropertyPattern.source, extraPropertyPattern.flags);
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        // Check what type of value follows
        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;

        // Skip whitespace
        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }

        if (valueEndPos >= sanitized.length) {
          continue;
        }

        const firstChar = sanitized[valueEndPos];

        if (firstChar === "{") {
          // Object value - find matching closing brace
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
          // String value - find closing quote (handling escaped quotes)
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
          valueEndPos++; // Include the closing quote
        } else {
          // Unknown value type, skip this match
          continue;
        }

        // Skip trailing comma if present
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
        });
      }

      // Remove matches in reverse order to maintain indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        // Clean up: if delimiter was a comma, remove it; if it was {, keep it
        let replacement = "";
        if (m.delimiter === ",") {
          // Remove the comma, but ensure there's proper JSON structure
          replacement = "";
          // Check if we need to add a comma before the next property
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          // If before ends with ] or } and after starts with ", we need a comma
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          // Remove any trailing comma or whitespace after the property value
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          // Keep the opening brace
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push("Removed extra_thoughts/extra_text property");
      }
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed heuristic JSON errors",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    logOneLineWarning(`fixHeuristicJsonErrors sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
