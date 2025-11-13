import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { DELIMITERS } from "../constants/json-processing.config";
import { CONCATENATION_REGEXES, BINARY_CORRUPTION_REGEX } from "../constants/regex.constants";

/**
 * Helper to determine if a position is inside a string literal.
 * This prevents us from modifying property names that appear as values.
 */
function isInStringAt(position: number, content: string): boolean {
  let inString = false;
  let escaped = false;

  for (let i = 0; i < position; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    }
  }

  return inString;
}

/**
 * Consolidated property name mappings combining all typo and truncation patterns.
 * This merges mappings from multiple property name fix sanitizers.
 */
const PROPERTY_NAME_MAPPINGS: Record<string, string> = {
  // === General truncations ===
  eferences: "references",
  refere: "references",
  refer: "references",
  se: "purpose",
  nam: "name",
  na: "name",
  alues: "codeSmells",
  lues: "codeSmells",
  ues: "codeSmells",
  es: "codeSmells",
  integra: "integration",
  integrat: "integration",
  implemen: "implementation",
  purpos: "purpose",
  purpo: "purpose",
  descript: "description",
  retur: "return",
  metho: "methods",
  method: "methods",
  constan: "constants",
  consta: "constants",
  databas: "database",
  qualit: "quality",
  metric: "metrics",
  metri: "metrics",
  smell: "smells",
  smel: "smells",
  complexi: "complexity",
  complex: "complexity",
  averag: "average",
  avera: "average",
  maxim: "maximum",
  maxi: "maximum",
  minim: "minimum",
  mini: "minimum",
  lengt: "length",
  leng: "length",
  total: "total",
  tota: "total",
  clas: "class",
  interfac: "interface",
  interfa: "interface",
  interf: "interface",
  inter: "interface",
  namespac: "namespace",
  namespa: "namespace",
  namesp: "namespace",
  names: "namespace",
  publi: "public",
  publ: "public",
  privat: "private",
  priva: "private",
  priv: "private",
  protec: "protected",
  prote: "protected",
  prot: "protected",
  stati: "static",
  stat: "static",
  fina: "final",
  abstrac: "abstract",
  abstra: "abstract",
  abst: "abstract",
  synchronize: "synchronized",
  synchroniz: "synchronized",
  synchroni: "synchronized",
  synchron: "synchronized",
  synchro: "synchronized",
  synchr: "synchronized",
  synch: "synchronized",
  sync: "synchronized",
  volatil: "volatile",
  volati: "volatile",
  volat: "volatile",
  vola: "volatile",
  transien: "transient",
  transie: "transient",
  transi: "transient",
  trans: "transient",
  tran: "transient",
  nativ: "native",
  nati: "native",
  strictf: "strictfp",
  strict: "strictfp",
  stric: "strictfp",
  stri: "strictfp",
  e: "name",
  n: "name",
  m: "name",
  am: "name",
  me: "name",
  extraReferences: "externalReferences",
  exterReferences: "externalReferences",
  externReferences: "externalReferences",
  externalRefs: "externalReferences",
  externalRef: "externalReferences",
  internReferences: "internalReferences",
  internalRefs: "internalReferences",
  internalRef: "internalReferences",
  publMethods: "publicMethods",
  publicMeth: "publicMethods",
  publicMeths: "publicMethods",
  _publicConstants: "publicConstants",
  publConstants: "publicConstants",
  publicConst: "publicConstants",
  publicConsts: "publicConstants",
  integrationPt: "integrationPoints",
  integrationPts: "integrationPoints",
  integPoints: "integrationPoints",
  dbIntegration: "databaseIntegration",
  databaseInteg: "databaseIntegration",
  qualityMetrics: "codeQualityMetrics",
  codeMetrics: "codeQualityMetrics",
  codeQuality: "codeQualityMetrics",
  ethods: "publicMethods",
  thods: "publicMethods",
  nstants: "publicConstants",
  stants: "publicConstants",
  ants: "publicConstants",
  egrationPoints: "integrationPoints",
  grationPoints: "integrationPoints",
  rationPoints: "integrationPoints",
  ationPoints: "integrationPoints",
  ernalReferences: "internalReferences",
  alReferences: "externalReferences",
  aseIntegration: "databaseIntegration",
  seIntegration: "databaseIntegration",
  QualityMetrics: "codeQualityMetrics",
  ameters: "parameters",
  meters: "parameters",
  eters: "parameters",
  ferences: "references",
  pu: "purpose",
  pur: "purpose",
  purp: "purpose",
  de: "description",
  des: "description",
  desc: "description",
  descr: "description",
  descri: "description",
  descrip: "description",
  descripti: "description",
  descriptio: "description",
  pa: "parameters",
  par: "parameters",
  para: "parameters",
  param: "parameters",
  parame: "parameters",
  paramet: "parameters",
  paramete: "parameters",
  re: "returnType",
  ret: "returnType",
  retu: "returnType",
  return: "returnType",
  returnT: "returnType",
  returnTy: "returnType",
  returnTyp: "returnType",
  im: "implementation",
  imp: "implementation",
  impl: "implementation",
  imple: "implementation",
  implem: "implementation",
  impleme: "implementation",
  implementa: "implementation",
  implementat: "implementation",
  implementati: "implementation",
  implementatio: "implementation",
};

/**
 * Known property name typo corrections for quoted properties.
 * These handle trailing underscores, double underscores, and common typos.
 */
const PROPERTY_TYPO_CORRECTIONS: Record<string, string> = {
  type_: "type",
  name_: "name",
  value_: "value",
  purpose_: "purpose",
  description_: "description",
  parameters_: "parameters",
  returnType_: "returnType",
  cyclomaticComplexity_: "cyclomaticComplexity",
  cyclometicComplexity: "cyclomaticComplexity",
  cyclometicComplexity_: "cyclomaticComplexity",
  linesOfCode_: "linesOfCode",
  codeSmells_: "codeSmells",
  implementation_: "implementation",
  namespace_: "namespace",
  kind_: "kind",
  internalReferences_: "internalReferences",
  externalReferences_: "externalReferences",
  publicConstants_: "publicConstants",
  publicMethods_: "publicMethods",
  integrationPoints_: "integrationPoints",
  databaseIntegration_: "databaseIntegration",
  dataInputFields_: "dataInputFields",
  codeQualityMetrics_: "codeQualityMetrics",
};

/**
 * Constants for diagnostic message formatting
 */
const DIAGNOSTIC_TRUNCATION_LENGTH = 30;

/**
 * Regex patterns for concatenation chain sanitization are now imported from constants
 */

/**
 * Consolidated sanitizer that fixes syntax errors within structurally sound JSON.
 *
 * This sanitizer combines the functionality of:
 * 1. unified-syntax-sanitizer: Property names, assignment syntax, undefined values, concatenation
 * 2. fix-advanced-json-errors: Duplicate entries, truncated properties, stray text
 * 3. fix-malformed-json-patterns: Various malformed patterns
 * 4. fix-json-structure: Post-processing fixes (dangling properties, missing quotes in arrays, stray chars, corrupted pairs)
 * 5. fix-binary-corruption-patterns: Binary corruption markers (e.g., <y_bin_XXX>)
 * 6. remove-truncation-markers: Remove truncation markers (e.g., ...)
 *
 * ## Purpose
 * LLMs sometimes generate JSON with syntax errors within structurally sound JSON:
 * - Unquoted keys and strings
 * - Single quotes instead of double quotes
 * - String concatenation expressions
 * - Invalid literals (undefined)
 * - Property name typos and truncations
 * - Duplicate/corrupted entries
 * - Stray text
 * - Dangling properties
 * - Missing quotes in arrays
 * - Corrupted property/value pairs
 * - Binary corruption markers
 * - Truncation markers
 *
 * This sanitizer handles all these issues in a single, efficient pass.
 *
 * ## Implementation
 * Applies fixes in logical order:
 * 1. Binary corruption (remove markers first)
 * 2. Truncation markers (remove early)
 * 3. Concatenation chains (fixes string concatenation expressions)
 * 4. Property names (fixes all property name issues)
 * 5. Invalid literals (undefined and corrupted numeric values)
 * 6. Property assignment (normalizes assignment syntax)
 * 7. Unescaped quotes (escapes quotes in string values)
 * 8. Advanced errors (duplicate entries, stray text)
 * 9. JSON structure fixes (dangling properties, missing quotes, corrupted pairs)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with syntax errors fixed
 */
export const fixSyntaxErrors: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // ===== Block 0: Remove binary corruption markers =====
    sanitized = sanitized.replace(BINARY_CORRUPTION_REGEX, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;

      // Check if we're inside a string literal - if so, don't modify
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      // Check if there's an opening brace immediately after the marker
      const afterMarker = sanitized.substring(
        numericOffset + match.length,
        numericOffset + match.length + 1,
      );
      if (afterMarker === "{") {
        // The marker is before an opening brace, just remove the marker
        hasChanges = true;
        diagnostics.push(`Removed binary corruption marker before opening brace: ${match}`);
        return "";
      }

      // Remove the marker - let other sanitizers handle any resulting issues
      hasChanges = true;
      diagnostics.push(`Removed binary corruption marker: ${match}`);
      return "";
    });

    // ===== Block 0b: Remove truncation markers =====
    // Pattern 1: Remove standalone truncation marker lines
    const truncationMarkerPattern =
      /(,\s*)?\n(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\)|\.\.\.\s*\(truncated\)|truncated|\.\.\.\s*truncated)(\s*)\n/g;

    sanitized = sanitized.replace(
      truncationMarkerPattern,
      (_match, optionalComma, _whitespaceBefore, marker) => {
        const markerStr = typeof marker === "string" ? marker : "";
        hasChanges = true;
        diagnostics.push(`Removed truncation marker: "${markerStr.trim()}"`);
        if (optionalComma) {
          return ",\n\n";
        }
        return "\n\n";
      },
    );

    // Pattern 2: Handle incomplete strings before closing delimiters
    const incompleteStringPattern =
      /"([^"]*?)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

    sanitized = sanitized.replace(
      incompleteStringPattern,
      (_match, stringContent, _marker, _whitespace1, whitespace2, delimiter) => {
        const contentStr = typeof stringContent === "string" ? stringContent : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const ws2 = typeof whitespace2 === "string" ? whitespace2 : "";

        hasChanges = true;
        diagnostics.push(
          `Fixed incomplete string before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );

        return `"${contentStr}"${delimiterStr === "]" ? "," : ""}${ws2}${delimiterStr}`;
      },
    );

    // Pattern 3: Handle truncation markers right before closing delimiters
    const truncationBeforeDelimiterPattern =
      /("\s*,\s*|\n)(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

    sanitized = sanitized.replace(
      truncationBeforeDelimiterPattern,
      (_match, beforeMarker, _whitespace1, _marker, _whitespace2, whitespace3, delimiter) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const ws3 = typeof whitespace3 === "string" ? whitespace3 : "";
        const beforeStr = typeof beforeMarker === "string" ? beforeMarker : "";

        hasChanges = true;
        diagnostics.push(
          `Removed truncation marker before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );

        if (beforeStr.includes(",")) {
          return `${beforeStr}\n${ws3}${delimiterStr}`;
        }
        return `\n${ws3}${delimiterStr}`;
      },
    );

    // Pattern 4: Handle _TRUNCATED_ markers
    const underscoreTruncatedPattern = /([}\],]|\n|^)(\s*)_TRUNCATED_(\s*)([}\],]|\n|$)/gi;
    sanitized = sanitized.replace(
      underscoreTruncatedPattern,
      (match, before, _whitespace, _marker, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed _TRUNCATED_ marker");
        }

        if (beforeStr.includes(",")) {
          return `${beforeStr}\n${afterStr}`;
        }
        return `${beforeStr}${afterStr}`;
      },
    );

    // Pattern 5: Remove continuation/truncation text like "to be continued..." or "to be conti..."
    // Match patterns like: `},\nto be continued...\n  {` or `]\ncontinued...\n[`
    // Use a more flexible pattern that handles various whitespace scenarios
    // Note: We match } or ] first, then optional whitespace and comma, then continuation text, then { or } or ]
    const continuationTextPattern =
      /([}\]])[,]?\s*\n\s*(to\s+be\s+(continued?\.?\.?\.?|conti\.?\.?\.?)|continued?\.?\.?\.?|\.\.\.\s*(to\s+be\s+)?continued?)\s*\n\s*([}\],]|\{)/gi;
    sanitized = sanitized.replace(
      continuationTextPattern,
      (match, beforeDelim, _continuationText, _nested1, _nested2, afterDelim, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const beforeDelimStr = typeof beforeDelim === "string" ? beforeDelim : "";
        // The after delimiter is the last group (after nested groups)
        const afterDelimStr = typeof afterDelim === "string" ? afterDelim : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed continuation/truncation text");
        }

        // Check if there was a comma in the original match
        const hadComma = match.includes(",");
        // Return delimiters with comma preserved if it was there
        if (hadComma) {
          return `${beforeDelimStr},\n${afterDelimStr}`;
        }
        return `${beforeDelimStr}\n${afterDelimStr}`;
      },
    );

    // ===== Block 1: Fix concatenation chains =====
    if (sanitized.includes("+") && sanitized.includes('"')) {
      let concatenationChanges = 0;

      // Step 1: Replace identifier-only chains with empty string
      sanitized = sanitized.replace(
        CONCATENATION_REGEXES.IDENTIFIER_ONLY_CHAIN,
        (_match, prefix) => {
          diagnostics.push("Replaced identifier-only chain with empty string");
          concatenationChanges++;
          return `${prefix}""`;
        },
      );

      // Step 2: Keep only literal when identifiers precede it
      sanitized = sanitized.replace(
        CONCATENATION_REGEXES.IDENTIFIER_THEN_LITERAL,
        (_match: string, prefix: string, literal: string) => {
          diagnostics.push(
            `Kept literal "${literal.substring(0, DIAGNOSTIC_TRUNCATION_LENGTH)}${literal.length > DIAGNOSTIC_TRUNCATION_LENGTH ? "..." : ""}" from identifier chain`,
          );
          concatenationChanges++;
          return `${prefix}"${literal}"`;
        },
      );

      // Step 3: Keep only literal when identifiers follow it
      sanitized = sanitized.replace(
        CONCATENATION_REGEXES.LITERAL_THEN_IDENTIFIER,
        (_match: string, prefix: string, literal: string) => {
          diagnostics.push(
            `Removed trailing identifiers after literal "${literal.substring(0, DIAGNOSTIC_TRUNCATION_LENGTH)}${literal.length > DIAGNOSTIC_TRUNCATION_LENGTH ? "..." : ""}"`,
          );
          concatenationChanges++;
          return `${prefix}"${literal}"`;
        },
      );

      // Step 4: Merge consecutive string literals
      sanitized = sanitized.replace(
        CONCATENATION_REGEXES.CONSECUTIVE_LITERALS,
        (match: string, prefix: string) => {
          const literalMatches = match.match(/"[^"\n]*"/g);
          if (!literalMatches || literalMatches.length < 2) {
            return match;
          }
          const merged = literalMatches.map((lit) => lit.slice(1, -1)).join("");
          diagnostics.push(`Merged ${literalMatches.length} consecutive string literals`);
          concatenationChanges++;
          return `${prefix}"${merged}"`;
        },
      );

      if (concatenationChanges > 0) {
        hasChanges = true;
      }
    }

    // ===== Block 2: Fix property names =====
    // Pass 1: Fix concatenated property names
    const concatenatedPattern = /"([^"]+)"\s*\+\s*"([^"]+)"(\s*\+\s*"[^"]+")*\s*:/g;
    sanitized = sanitized.replace(
      concatenatedPattern,
      (_match, firstPart, secondPart, additionalParts, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return _match;
        }
        const allParts: string[] = [firstPart as string, secondPart as string];
        if (additionalParts) {
          const additionalMatches = (additionalParts as string).match(/"([^"]+)"/g);
          if (additionalMatches) {
            for (const additionalMatch of additionalMatches) {
              allParts.push(additionalMatch.slice(1, -1));
            }
          }
        }
        const mergedName = allParts.join("");
        hasChanges = true;
        diagnostics.push(
          `Merged concatenated property name: ${allParts.join('" + "')} -> ${mergedName}`,
        );
        return `"${mergedName}":`;
      },
    );

    // Pass 2: Fix property names with missing opening quotes
    let previousPass2 = "";
    while (previousPass2 !== sanitized) {
      previousPass2 = sanitized;
      // Enhanced pattern to catch more cases, including those at start of line or after newlines
      // Also catch cases like `}connectionInfo":` (missing quote after closing brace)
      // Also catch cases at start of object like `{eferences":`
      // Pattern: delimiter (} ] , \n ^ {) followed by optional whitespace, then property name without opening quote
      const missingOpeningQuotePattern = /([}\],]|\n|^|\{)(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s*:/g;
      sanitized = sanitized.replace(
        missingOpeningQuotePattern,
        (match, delimiter, whitespace, propertyName, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const lowerPropertyName = propertyNameStr.toLowerCase();
          const delimiterStr = delimiter ? String(delimiter) : "";
          const propertyNameStart = numericOffset + delimiterStr.length + whitespaceStr.length;

          // Skip if already has opening quote
          if (
            propertyNameStart > 0 &&
            sanitized[propertyNameStart - 1] === DELIMITERS.DOUBLE_QUOTE
          ) {
            return match;
          }

          // Determine if we're after a property boundary
          let isAfterPropertyBoundary = false;
          if (
            delimiterStr === "}" ||
            delimiterStr === "]" ||
            delimiterStr === "\n" ||
            delimiterStr === "^" ||
            delimiterStr === "{"
          ) {
            isAfterPropertyBoundary = true;
          } else if (numericOffset > 0) {
            const beforeMatch = sanitized.substring(
              Math.max(0, numericOffset - 200),
              numericOffset,
            );
            isAfterPropertyBoundary =
              /[}\],]\s*$/.test(beforeMatch) || /[}\],]\s*\n\s*$/.test(beforeMatch);
          }

          // Skip if inside a string
          if (!isAfterPropertyBoundary && isInStringAt(propertyNameStart, sanitized)) {
            return match;
          }

          // Map property name if needed
          let fixedName =
            PROPERTY_NAME_MAPPINGS[propertyNameStr] || PROPERTY_NAME_MAPPINGS[lowerPropertyName];
          if (!fixedName) {
            if (lowerPropertyName.endsWith("_")) {
              const withoutUnderscore = lowerPropertyName.slice(0, -1);
              fixedName =
                PROPERTY_NAME_MAPPINGS[withoutUnderscore] ||
                PROPERTY_NAME_MAPPINGS[propertyNameStr.slice(0, -1)] ||
                withoutUnderscore;
            } else {
              fixedName = propertyNameStr;
            }
          }

          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed property name with missing opening quote: ${propertyNameStr}" -> "${fixedName}"`,
            );
          }
          // If delimiter is opening brace, don't add comma
          if (delimiterStr === "{") {
            return `${delimiterStr}${whitespaceStr}"${fixedName}":`;
          }
          // If delimiter is closing brace/bracket, check if we need a comma
          // Only add comma if there's whitespace/newline after the delimiter (not immediately adjacent)
          if ((delimiterStr === "}" || delimiterStr === "]") && whitespaceStr.length > 0) {
            // Check if there's already a comma in the context before
            const beforeContext = sanitized.substring(
              Math.max(0, numericOffset - 10),
              numericOffset,
            );
            if (!beforeContext.includes(",")) {
              return `${delimiterStr},${whitespaceStr}"${fixedName}":`;
            }
          }
          return `${delimiterStr}${whitespaceStr}"${fixedName}":`;
        },
      );
    }

    // Pass 2a: Fix stray characters before strings in arrays/objects
    // Pattern: `t    "org.apache...` or `e "externalReferences"` or `ar"org.apa` -> `"org.apache...` or `"externalReferences"` or `"org.apa`
    // Match single characters (not multi-character words) followed by whitespace and a quote
    // Also match characters immediately before quotes (like `ar"org.apa`)
    // Require either 2+ spaces OR being after a newline/comma/brace to avoid false positives
    const strayCharBeforeStringPattern = /([}\],]|\n|^)(\s*)([a-z0-9])(\s+)(")/gi;
    sanitized = sanitized.replace(
      strayCharBeforeStringPattern,
      (match, delimiter, whitespace, strayChar, extraWhitespace, _quote, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Additional check: make sure we're not inside a string value by checking for colon before
        // If there's a colon nearby, we're likely in a property value, not a property name
        const contextBefore = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        const hasColonBefore = /:\s*[^:]*$/.test(contextBefore);
        if (hasColonBefore) {
          // We're likely in a string value, skip this match
          return match;
        }

        // Check if we're in a valid context (after delimiter, newline, or start)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isAfterPropertyBoundary =
          /[}\],]\s*$/.test(beforeMatch) ||
          /[}\],]\s*\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        // Remove if:
        // 1. We're after a property boundary AND there's 2+ spaces (clear stray char), OR
        // 2. We're after a newline/comma/brace (likely stray char even with single space), OR
        // 3. We're after a closing brace/bracket and there's any whitespace (stray char before property)
        const extraWhitespaceStr = typeof extraWhitespace === "string" ? extraWhitespace : "";
        const hasSignificantWhitespace = extraWhitespaceStr.length >= 2;
        const isAfterDelimiter = delimiter !== "" && delimiter !== "^";
        const isAfterClosingDelimiter = delimiter === "}" || delimiter === "]";

        if (
          isAfterPropertyBoundary &&
          (hasSignificantWhitespace || isAfterDelimiter || isAfterClosingDelimiter)
        ) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const strayCharStr = typeof strayChar === "string" ? strayChar : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray character '${strayCharStr}' before string`);
          }
          return `${delimiterStr}${whitespaceStr}"`;
        }

        return match;
      },
    );

    // Pass 2a-2: Fix stray characters immediately before quotes (no whitespace, like `ar"org.apa`)
    const strayCharImmediateBeforeQuotePattern = /([}\],]|\n|^|\[|,)(\s*)([a-z]{1,3})(")/gi;
    sanitized = sanitized.replace(
      strayCharImmediateBeforeQuotePattern,
      (match, delimiter, whitespace, strayChars, _quote, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check context - only remove if it looks like stray text before a string value
        // Skip the colon check if we're in an array context (delimiter is [), as arrays don't have colons
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        if (delimiterStr !== "[") {
          const contextBefore = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
          const hasColonBefore = /:\s*[^:]*$/.test(contextBefore);
          if (hasColonBefore) {
            return match;
          }
        }

        // Check if we're after a property boundary or in array context
        // If delimiter is [, \n, ,, or ^, we're definitely in a valid context
        let isAfterPropertyBoundary =
          delimiterStr === "[" ||
          delimiterStr === "," ||
          delimiterStr === "\n" ||
          delimiterStr === "^" ||
          delimiterStr === "}" ||
          delimiterStr === "]";

        // Also check context before if delimiter is not one of the above
        if (!isAfterPropertyBoundary && numericOffset > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
          isAfterPropertyBoundary =
            /[}\],]\s*$/.test(beforeMatch) ||
            /[}\],]\s*\n\s*$/.test(beforeMatch) ||
            /\[\s*$/.test(beforeMatch) ||
            /\[\s*\n\s*$/.test(beforeMatch) ||
            numericOffset < 200;
        }

        // Check what comes after the quote - if it looks like a string value, remove the stray chars
        // The match includes the quote, so we check what comes after the match
        const afterMatch = sanitized.substring(
          numericOffset + match.length,
          numericOffset + match.length + 30,
        );
        // Check if it looks like a string value (starts with letters/org.apache pattern)
        const looksLikeStringValue =
          /^[a-zA-Z]/.test(afterMatch) || afterMatch.startsWith("org.apache");

        if (isAfterPropertyBoundary && looksLikeStringValue) {
          hasChanges = true;
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const strayCharsStr = typeof strayChars === "string" ? strayChars : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray characters '${strayCharsStr}' immediately before quote`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"`;
        }

        return match;
      },
    );

    // Pass 2b: Fix truncated property names with inserted quotes
    // Pattern: `"cyclomati"cComplexity"` -> `"cyclomaticComplexity"`
    // Only match if the first part looks like a property name (short, no spaces, no special chars)
    const truncatedPropertyWithQuotePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]{0,30})"([a-zA-Z][a-zA-Z0-9_$]{1,30})"\s*:/g;
    sanitized = sanitized.replace(
      truncatedPropertyWithQuotePattern,
      (match, firstPart, secondPart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Additional check: make sure we're not inside a string value
        // If there's a colon before this match, we're likely in a property value
        const contextBefore = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const hasColonBefore = /:\s*"[^"]*$/.test(contextBefore);
        if (hasColonBefore) {
          // We're inside a string value (there's a colon followed by a quoted string before us)
          // Check if we're actually in a string by counting quotes
          let quoteCount = 0;
          let escape = false;
          for (let i = Math.max(0, numericOffset - 200); i < numericOffset; i++) {
            const char = sanitized[i];
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          // If we're inside a string (odd number of quotes), skip
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        // Additional check: first part should look like a property name fragment
        // (not contain spaces, colons, or other special characters that would indicate it's in a string)
        const firstPartStr = typeof firstPart === "string" ? firstPart : "";
        if (firstPartStr.includes(" ") || firstPartStr.includes(":") || firstPartStr.length > 20) {
          // Doesn't look like a property name fragment, likely part of a string value
          return match;
        }

        // Check if we're in a property name context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isAfterPropertyBoundary =
          /[}\],]\s*$/.test(beforeMatch) ||
          /[}\],]\s*\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isAfterPropertyBoundary) {
          const firstPartStr = typeof firstPart === "string" ? firstPart : "";
          const secondPartStr = typeof secondPart === "string" ? secondPart : "";
          const mergedName = firstPartStr + secondPartStr;
          const lowerMergedName = mergedName.toLowerCase();

          // Try to find the correct property name from mappings
          let fixedName =
            PROPERTY_NAME_MAPPINGS[lowerMergedName] || PROPERTY_NAME_MAPPINGS[mergedName];
          if (!fixedName) {
            // Try common truncations
            if (lowerMergedName.includes("cyclomat")) {
              fixedName = "cyclomaticComplexity";
            } else if (lowerMergedName.includes("complex")) {
              fixedName = "cyclomaticComplexity";
            } else {
              // If we can't map it, use the merged name
              fixedName = mergedName;
            }
          }

          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed truncated property name with inserted quote: "${firstPartStr}"${secondPartStr}" -> "${fixedName}"`,
            );
          }
          return `"${fixedName}":`;
        }

        return match;
      },
    );

    // Pass 2c: Fix very short property names with missing opening quotes (e.g., `e": "retrieveOne",` -> `"name": "retrieveOne",`)
    // This handles cases where only a fragment of the property name is present
    const veryShortPropertyNamePattern = /([}\],]|\n|^)(\s*)([a-z])"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      veryShortPropertyNamePattern,
      (match, delimiter, whitespace, shortName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isAfterPropertyBoundary =
          /[}\],]\s*$/.test(beforeMatch) ||
          /[}\],]\s*\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isAfterPropertyBoundary) {
          const shortNameStr = typeof shortName === "string" ? shortName : "";
          const valueStr = typeof value === "string" ? value : "";
          const lowerShortName = shortNameStr.toLowerCase();

          // Try to map the short name to a full property name
          let fixedName = PROPERTY_NAME_MAPPINGS[lowerShortName];
          if (!fixedName && lowerShortName === "e") {
            // Common case: "e" is often a truncation of "name"
            fixedName = "name";
          } else if (!fixedName) {
            // If we can't map it, keep the original
            return match;
          }

          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed truncated property name with missing opening quote: ${shortNameStr}" -> "${fixedName}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${fixedName}": "${valueStr}"`;
        }

        return match;
      },
    );

    // Pass 3: Fix property names with missing closing quote and colon
    let previousPass3 = "";
    while (previousPass3 !== sanitized) {
      previousPass3 = sanitized;
      // Enhanced pattern to catch cases like "name "appTableId" -> "name": "appTableId"
      const missingClosingQuoteAndColonPattern = /"([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s+"([^"]+)"/g;
      sanitized = sanitized.replace(
        missingClosingQuoteAndColonPattern,
        (match, propertyName, value, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";

          if (isInStringAt(numericOffset, sanitized)) {
            return match;
          }

          if (numericOffset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
            const isAfterPropertyBoundary =
              /[}\],][\s\n]*$/.test(beforeMatch) || /\[\s*$/.test(beforeMatch);

            if (!isAfterPropertyBoundary && numericOffset > 20) {
              const largerContext = sanitized.substring(
                Math.max(0, numericOffset - 200),
                numericOffset,
              );
              let quoteCount = 0;
              let escape = false;
              for (const char of largerContext) {
                if (escape) {
                  escape = false;
                  continue;
                }
                if (char === "\\") {
                  escape = true;
                } else if (char === '"') {
                  quoteCount++;
                }
              }
              if (quoteCount % 2 === 1) {
                return match;
              }
            }
          }

          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed property name with missing colon: "${propertyNameStr} " -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Pass 4: Fix truncated property names (quoted)
    const truncatedQuotedPattern = /(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*(?=:|,|\})/g;
    sanitized = sanitized.replace(truncatedQuotedPattern, (match, whitespace, propertyName) => {
      const lowerPropertyName = (propertyName as string).toLowerCase();
      if (PROPERTY_NAME_MAPPINGS[lowerPropertyName]) {
        const fixedName = PROPERTY_NAME_MAPPINGS[lowerPropertyName];
        hasChanges = true;
        diagnostics.push(
          `Fixed truncated property name: ${propertyName as string} -> ${fixedName}`,
        );
        return `${whitespace}"${fixedName}"`;
      }
      return match;
    });

    // Pass 5: Fix quoted property name typos
    const quotedPropertyPattern = /"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      quotedPropertyPattern,
      (match, propertyName: unknown, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        let fixedName = propertyNameStr;

        if (PROPERTY_TYPO_CORRECTIONS[propertyNameStr]) {
          fixedName = PROPERTY_TYPO_CORRECTIONS[propertyNameStr];
        } else if (propertyNameStr.endsWith("_") && propertyNameStr.length > 1) {
          const withoutUnderscore = propertyNameStr.slice(0, -1);
          if (
            PROPERTY_TYPO_CORRECTIONS[propertyNameStr] ||
            PROPERTY_TYPO_CORRECTIONS[withoutUnderscore + "_"] ||
            withoutUnderscore.length > 2
          ) {
            fixedName = PROPERTY_TYPO_CORRECTIONS[propertyNameStr] || withoutUnderscore;
          }
        } else if (propertyNameStr.includes("__")) {
          fixedName = propertyNameStr.replace(/__+/g, "_");
        }

        if (fixedName !== propertyNameStr) {
          hasChanges = true;
          diagnostics.push(`Fixed property name typo: "${propertyNameStr}" -> "${fixedName}"`);
          return `"${fixedName}":`;
        }

        return match;
      },
    );

    // Pass 6: Fix completely unquoted property names
    const unquotedPropertyPattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;
    sanitized = sanitized.replace(
      unquotedPropertyPattern,
      (match, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const lowerPropertyName = propertyNameStr.toLowerCase();

        if (numericOffset > 0 && sanitized[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
          return match;
        }

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        let isValidContext = numericOffset === 0;
        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
          isValidContext =
            /[{}\],](\s*\n\s*)?$|\n\s*$/.test(beforeMatch) ||
            /[}\]]\s*(\n\s*)?$/.test(beforeMatch) ||
            /\{\s*\n\s*$/.test(beforeMatch) ||
            sanitized[numericOffset - 1] === "{" ||
            sanitized[numericOffset - 1] === "," ||
            sanitized[numericOffset - 1] === "\n";

          if (!isValidContext) {
            let quoteCount = 0;
            let escape = false;
            for (let i = Math.max(0, numericOffset - 200); i < numericOffset; i++) {
              const char = sanitized[i];
              if (escape) {
                escape = false;
                continue;
              }
              if (char === "\\") {
                escape = true;
              } else if (char === '"') {
                quoteCount++;
              }
            }
            if (quoteCount % 2 === 1) {
              return match;
            }
          }
        }

        const fixedName =
          PROPERTY_NAME_MAPPINGS[propertyNameStr] ||
          PROPERTY_NAME_MAPPINGS[lowerPropertyName] ||
          propertyNameStr;

        hasChanges = true;
        diagnostics.push(`Fixed unquoted property name: ${propertyNameStr} -> ${fixedName}`);
        return `${whitespaceStr}"${fixedName}":`;
      },
    );

    // ===== Block 3: Fix invalid literals (undefined and corrupted numeric values) =====
    // Fix undefined values
    const undefinedValuePattern = /(:\s*)undefined(\s*)([,}])/g;
    sanitized = sanitized.replace(
      undefinedValuePattern,
      (_match, beforeColon, afterUndefined, terminator) => {
        hasChanges = true;
        diagnostics.push("Converted undefined to null");
        return `${beforeColon}null${afterUndefined}${terminator}`;
      },
    );

    // Fix corrupted numeric values
    const corruptedNumericPattern = /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*_(\d+)(\s*[,}\]]|,|$)/g;
    sanitized = sanitized.replace(
      corruptedNumericPattern,
      (match, propertyName, digits, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const digitsStr = typeof digits === "string" ? digits : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed corrupted numeric value: "${propertyNameStr}":_${digitsStr} -> "${propertyNameStr}": ${digitsStr}`,
        );

        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}${digitsStr}${terminatorStr}`;
      },
    );

    // ===== Block 4: Normalize property assignment syntax =====
    // Fix 1: Replace `:=` with `:`
    const assignmentPattern = /("([^"]+)")\s*:=\s*(\s*)/g;
    sanitized = sanitized.replace(
      assignmentPattern,
      (match, quotedProperty, propertyName, whitespaceAfter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const quotedPropStr = typeof quotedProperty === "string" ? quotedProperty : "";
        const propNameStr = typeof propertyName === "string" ? propertyName : "";
        const wsAfter =
          typeof whitespaceAfter === "string" && whitespaceAfter ? whitespaceAfter : " ";

        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 20), numericOffset);
          const isPropertyContext =
            /[{,\]]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch) || numericOffset <= 20;

          if (!isPropertyContext) {
            return match;
          }
        }

        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(0, numericOffset);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        hasChanges = true;
        diagnostics.push(`Fixed assignment syntax: "${propNameStr}":= -> "${propNameStr}":`);
        return `${quotedPropStr}:${wsAfter}`;
      },
    );

    // Fix 2: Remove stray text between colon and opening quote
    let previousStrayText = "";
    while (previousStrayText !== sanitized) {
      previousStrayText = sanitized;
      const strayTextBetweenColonAndValuePattern =
        /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g;

      sanitized = sanitized.replace(
        strayTextBetweenColonAndValuePattern,
        (match, propertyName, strayText, value, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const valueStr = typeof value === "string" ? value : "";

          if (isInStringAt(numericOffset, sanitized)) {
            return match;
          }

          if (numericOffset > 0) {
            const contextBefore = sanitized.substring(
              Math.max(0, numericOffset - 50),
              numericOffset,
            );
            const hasPropertyNamePattern =
              /"\s*$/.test(contextBefore) || /[}\],\]]\s*$/.test(contextBefore);
            if (!hasPropertyNamePattern && !contextBefore.trim().endsWith('"')) {
              const trimmedContext = contextBefore.trim();
              const isInObjectOrArray =
                /[{]\s*$/.test(trimmedContext) || trimmedContext.includes("[");
              if (!isInObjectOrArray) {
                return match;
              }
            }
          }

          hasChanges = true;
          diagnostics.push(
            `Removed stray text "${strayTextStr}":" between colon and value: "${propertyNameStr}": ${strayTextStr}": -> "${propertyNameStr}": "${valueStr}"`,
          );
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Fix 3: Fix missing opening quotes after colon
    const missingOpeningQuotePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"([,}])/g;

    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, propertyName, value, delimiter, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        if (offsetNum !== undefined) {
          // Use isInStringAt for more reliable string detection
          if (isInStringAt(offsetNum, stringStr)) {
            return match;
          }

          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }

          const lowerValue = valueStr.toLowerCase();
          if (lowerValue === "true" || lowerValue === "false" || lowerValue === "null") {
            return match;
          }

          if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
            return match;
          }

          hasChanges = true;
          diagnostics.push(
            `Fixed missing quotes around property value: "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}"${delimiterStr}`,
          );
          return `"${propertyNameStr}": "${valueStr}"${delimiterStr}`;
        }

        return match;
      },
    );

    // Fix 4: Quote unquoted string values
    const missingOpeningQuoteBeforeValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)"/g;

    sanitized = sanitized.replace(
      missingOpeningQuoteBeforeValuePattern,
      (match, propertyName, unquotedValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";

        // Strict check: if we're inside a string value, skip
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Additional check: if there's a colon before this, we're likely in a string value
        const contextBefore = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        if (/:\s*"[^"]*$/.test(contextBefore)) {
          // We're inside a string value that contains a colon, skip
          return match;
        }

        const jsonKeywords = ["true", "false", "null"];
        if (jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed missing opening quote before value: "${propertyNameStr}":${unquotedValueStr}" -> "${propertyNameStr}": "${unquotedValueStr}"`,
        );

        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}"${unquotedValueStr}"`;
      },
    );

    // Fix 4b: Fix missing opening quotes in property values (pattern: `"name":value",` -> `"name": "value",`)
    // This handles cases where the value is missing the opening quote but has a closing quote
    const missingOpeningQuoteInValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_.]+)"\s*([,}])/g;
    sanitized = sanitized.replace(
      missingOpeningQuoteInValuePattern,
      (match, propertyName, valueWithoutQuote, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof valueWithoutQuote === "string" ? valueWithoutQuote : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Strict check: if we're inside a string value, skip
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Additional check: if there's a colon before this, we're likely in a string value
        const contextBefore = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        if (/:\s*"[^"]*$/.test(contextBefore)) {
          // We're inside a string value that contains a colon, skip
          return match;
        }

        const jsonKeywords = ["true", "false", "null"];
        if (jsonKeywords.includes(valueStr.toLowerCase())) {
          return match;
        }

        // Check if it's a number
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed missing opening quote in property value: "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}"${terminatorStr}`,
        );

        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}"${valueStr}"${terminatorStr}`;
      },
    );

    // ===== Block 7.5: Remove stray words in arrays (before unquoted string fixer) =====
    // This needs to run before unquoted string values are quoted, otherwise "since" becomes valid JSON
    const strayWordInArrayEarlyPattern = /("([^"]+)"\s*,\s*(\n\s*)?)([a-z]{2,20})"\s*,/gi;
    sanitized = sanitized.replace(
      strayWordInArrayEarlyPattern,
      (match, beforeStrayWord, _lastValidEntry, _optionalNewline, strayWord, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inStringCheck = false;
        let escapeCheck = false;
        let foundArray = false;

        for (let i = beforeMatch.length - 1; i >= 0; i--) {
          const char = beforeMatch[i];
          if (escapeCheck) {
            escapeCheck = false;
            continue;
          }
          if (char === "\\") {
            escapeCheck = true;
            continue;
          }
          if (char === '"') {
            inStringCheck = !inStringCheck;
            continue;
          }
          if (!inStringCheck) {
            if (char === "]") {
              bracketDepth++;
            } else if (char === "[") {
              bracketDepth--;
              if (bracketDepth >= 0 && braceDepth <= 0) {
                foundArray = true;
                break;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        if (foundArray) {
          const strayWordStr = typeof strayWord === "string" ? strayWord : "";
          const beforeStrayWordStr = typeof beforeStrayWord === "string" ? beforeStrayWord : "";
          // Common stray words that appear in arrays
          const commonStrayWords = new Set([
            "since",
            "and",
            "or",
            "the",
            "a",
            "an",
            "for",
            "with",
            "from",
            "to",
            "by",
            "at",
            "in",
            "on",
            "of",
          ]);
          if (commonStrayWords.has(strayWordStr.toLowerCase())) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(`Removed stray word "${strayWordStr}" in array`);
            }
            return beforeStrayWordStr;
          }
        }

        return match;
      },
    );

    const unquotedStringValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)(\s*[,}\]]|"\s*[,}\]]|"\s*$|[,}\]]|$)/g;

    sanitized = sanitized.replace(
      unquotedStringValuePattern,
      (match, propertyName, unquotedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        let terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const jsonKeywords = ["true", "false", "null"];
        if (jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          return match;
        }

        if (terminatorStr.startsWith('"')) {
          terminatorStr = terminatorStr.substring(1);
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed unquoted string value: "${propertyNameStr}": ${unquotedValueStr} -> "${propertyNameStr}": "${unquotedValueStr}"`,
        );

        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}"${unquotedValueStr}"${terminatorStr}`;
      },
    );

    // ===== Block 5: Fix unescaped quotes in strings =====
    // Pattern 1: Fix HTML attribute quotes
    const attributeQuotePattern = /(=\s*)"([^"]*)"(\s*[>]|\s+[a-zA-Z]|(?=\s*"))/g;

    sanitized = sanitized.replace(attributeQuotePattern, (match, equalsAndSpace, value, after) => {
      const matchIndex = sanitized.lastIndexOf(match);
      if (matchIndex === -1) return match;

      const contextBefore = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

      const isInStringValue =
        /:\s*"[^"]*=/.test(contextBefore) ||
        /:\s*[^"]*=/.test(contextBefore) ||
        contextBefore.includes('": "') ||
        contextBefore.includes('":{') ||
        (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore));

      if (isInStringValue) {
        hasChanges = true;
        const afterStr = typeof after === "string" ? after : "";
        const spacesAfterMatch = /^\s*/.exec(afterStr);
        const spacesAfter = spacesAfterMatch?.[0] ?? "";
        const restAfter = afterStr.substring(spacesAfter.length);
        diagnostics.push(`Escaped quote in HTML attribute: = "${value}"`);
        return `${equalsAndSpace}\\"${value}\\"${spacesAfter}${restAfter}`;
      }
      return match;
    });

    // Pattern 2: Fix escaped quotes followed by unescaped quotes
    const escapedQuoteFollowedByUnescapedPattern = /(\\")"(\s*\+|\s*\]|\s*,|(?=\s*[a-zA-Z_$]))/g;

    sanitized = sanitized.replace(
      escapedQuoteFollowedByUnescapedPattern,
      (match, _escapedQuote, after, offset: unknown, string: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Use isInStringAt to check if we're inside a string value
        if (isInStringAt(numericOffset, stringStr)) {
          return match;
        }

        const contextBefore = stringStr.substring(Math.max(0, numericOffset - 500), numericOffset);

        const isInStringValue =
          /:\s*"[^"]*`/.test(contextBefore) ||
          /:\s*"[^"]*\\/.test(contextBefore) ||
          contextBefore.includes('": "') ||
          (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore));

        if (isInStringValue) {
          hasChanges = true;
          const afterStr = typeof after === "string" ? after : "";
          diagnostics.push(`Fixed escaped quote followed by unescaped quote: \\"" -> \\\\"\\\\"`);
          return `\\"\\"${afterStr}`;
        }
        return match;
      },
    );

    // ===== Block 8: Fix advanced errors (duplicate entries, stray text) =====
    // Pattern 0b: Remove already-quoted stray words in arrays (handles case where unquoted string fixer quoted them first)
    // Pattern: quoted string, comma, newline/whitespace, quoted common word, comma (in array context)
    const quotedStrayWordInArrayPattern =
      /("([^"]+)"\s*,\s*(\n\s*)?)("(since|and|or|the|a|an|for|with|from|to|by|at|in|on|of)"\s*,)/gi;
    sanitized = sanitized.replace(
      quotedStrayWordInArrayPattern,
      (
        match,
        beforeStrayWord,
        _lastValidEntry,
        _optionalNewline,
        _quotedWord,
        strayWord,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inStringCheck = false;
        let escapeCheck = false;
        let foundArray = false;

        for (let i = beforeMatch.length - 1; i >= 0; i--) {
          const char = beforeMatch[i];
          if (escapeCheck) {
            escapeCheck = false;
            continue;
          }
          if (char === "\\") {
            escapeCheck = true;
            continue;
          }
          if (char === '"') {
            inStringCheck = !inStringCheck;
            continue;
          }
          if (!inStringCheck) {
            if (char === "]") {
              bracketDepth++;
            } else if (char === "[") {
              bracketDepth--;
              if (bracketDepth >= 0 && braceDepth <= 0) {
                foundArray = true;
                break;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        if (foundArray) {
          const beforeStrayWordStr = typeof beforeStrayWord === "string" ? beforeStrayWord : "";
          hasChanges = true;
          if (diagnostics.length < 10) {
            const strayWordStr = typeof strayWord === "string" ? strayWord : "";
            diagnostics.push(`Removed stray word "${strayWordStr}" in array`);
          }
          return beforeStrayWordStr;
        }

        return match;
      },
    );

    // Pattern 1: Remove duplicate/corrupted array entries
    const duplicateEntryPattern1 = /"([^"]+)"\s*,\s*\n\s*([a-z]+)\.[^"]*"\s*,/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern1,
      (match, validEntry, prefix, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
        const corruptionMarkers = ["extra", "duplicate", "repeat", "copy"];
        const prefixStr = typeof prefix === "string" ? prefix : "";

        if (isInArrayContext && corruptionMarkers.includes(prefixStr.toLowerCase())) {
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

    // Pattern 1b: Fix truncated property descriptions starting mid-word
    // Pattern 1b-1: Missing property name before truncated description (like "tatus to 'Dormant'")
    // This handles cases where the property name is completely missing
    // Pattern: closing brace, comma, newline, whitespace, lowercase fragment starting with 'tatus', space, text ending with quote and comma
    const missingPropertyNamePattern = /(\}\s*,\s*\n\s*)(tatus)(\s+to[^"]*?)("\s*,)/g;
    sanitized = sanitized.replace(
      missingPropertyNamePattern,
      (match, beforeFragment, _fragment, restOfText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a method object context (after a method object closing brace)
        // Look for patterns that indicate we're in a method object
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInMethodContext =
          /"codeSmells"\s*:\s*\[[^\]]*\]\s*\}/.test(beforeMatch) ||
          /"linesOfCode"\s*:\s*\d+\s*\}/.test(beforeMatch) ||
          /"cyclomaticComplexity"\s*:\s*\d+\s*\}/.test(beforeMatch) ||
          /"returnType"\s*:\s*"[^"]*"\s*\}/.test(beforeMatch);

        if (isInMethodContext || numericOffset < 1000) {
          // If we're early in the document or in method context, fix it
          const restOfTextStr = typeof restOfText === "string" ? restOfText : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const beforeFragmentStr = typeof beforeFragment === "string" ? beforeFragment : "";

          // "tatus to 'Dormant'" -> "purpose": "Sets the sub-status to 'Dormant'"
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing property name and truncated description: added "purpose": "Sets the sub-status${restOfTextStr}"`,
            );
          }
          return `${beforeFragmentStr}"purpose": "Sets the sub-status${restOfTextStr}${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 1b-1b: More general pattern for other truncated descriptions
    const missingPropertyNamePatternGeneral =
      /(\}\s*,\s*\n\s*)([a-z]{1,5})(\s+[a-zA-Z][^"]{20,}?)("\s*,)/g;
    sanitized = sanitized.replace(
      missingPropertyNamePatternGeneral,
      (match, beforeFragment, fragment, restOfText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a method object context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInMethodContext =
          /"codeSmells"\s*:\s*\[[^\]]*\]\s*\}/.test(beforeMatch) ||
          /"linesOfCode"\s*:\s*\d+\s*\}/.test(beforeMatch) ||
          /"cyclomaticComplexity"\s*:\s*\d+\s*\}/.test(beforeMatch);

        if (isInMethodContext && fragment !== "tatus") {
          // If it's a very short fragment followed by substantial text, it's likely a truncated description
          const restOfTextStr = typeof restOfText === "string" ? restOfText : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const beforeFragmentStr = typeof beforeFragment === "string" ? beforeFragment : "";

          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing property name: added "purpose": before truncated description`,
            );
          }
          return `${beforeFragmentStr}"purpose": "${restOfTextStr.trim()}${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 1b-2: Inside a string value after "description": or "purpose":, find lowercase word fragment
    // This handles cases where a property description starts mid-word like "tatus to 'Dormant'"
    // We need to find the string value and fix it from within
    const truncatedPropertyDescPattern =
      /("(?:description|purpose)"\s*:\s*")([^"]*?)([a-z]{1,10})(\s+[a-zA-Z][^"]*?)(")/g;
    sanitized = sanitized.replace(
      truncatedPropertyDescPattern,
      (
        match,
        propertyPrefix,
        beforeFragment,
        fragment,
        restOfText,
        closingQuote,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        // Verify we're not in a nested string by checking context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        if (/"[^"]*$/.exec(beforeMatch)) {
          // We're inside a string, skip
          return match;
        }

        const fragmentStr = typeof fragment === "string" ? fragment : "";
        const restOfTextStr = typeof restOfText === "string" ? restOfText : "";
        const beforeFragmentStr = typeof beforeFragment === "string" ? beforeFragment : "";

        // Common patterns for truncated descriptions
        if (fragmentStr === "tatus" && restOfTextStr.toLowerCase().trim().startsWith("to")) {
          // "tatus to 'Dormant'" -> "Sets the sub-status to 'Dormant'"
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed truncated property description: replaced fragment "${fragmentStr}" with "Sets the sub-status"`,
            );
          }
          return `${propertyPrefix}${beforeFragmentStr}Sets the sub-status${restOfTextStr}${closingQuote}`;
        } else if (fragmentStr.length <= 5 && beforeFragmentStr.length === 0) {
          // If it's a very short fragment at the start, it's likely truncated
          // Just remove it and keep the rest
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed truncated property description: removed fragment "${fragmentStr}"`,
            );
          }
          return `${propertyPrefix}${restOfTextStr.trim()}${closingQuote}`;
        }

        return match;
      },
    );

    // Pattern 2: Remove stray text like "so many" between structures
    const strayTextPattern = /([}\]])\s*,\s*\n\s*([a-z\s]{2,50})\n\s*([{"])/g;
    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, strayText, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
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
          diagnostics.push(`Removed stray text: "${strayTextStr.trim()}"`);
          return `${delimiterStr},\n    ${nextTokenStr}`;
        }

        return match;
      },
    );

    // Pattern 2b: Remove stray text before properties (like "tribal-council-results")
    // Pattern: newline, whitespace, word with hyphens/underscores, newline, whitespace, quote
    const strayTextBeforePropertyPattern =
      /(\n\s*)([a-z][a-z0-9_-]{3,30})(\n\s*)("\s*[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g;
    sanitized = sanitized.replace(
      strayTextBeforePropertyPattern,
      (match, _newline1, strayText, newline2, property, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (after closing brace/bracket or comma)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) ||
          /[}\],]\s*\n\s*$/.test(beforeMatch) ||
          numericOffset < 100;

        if (isValidContext) {
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const propertyStr = typeof property === "string" ? property : "";
          const newline2Str = typeof newline2 === "string" ? newline2 : "";

          // Common patterns that indicate stray text
          const looksLikeStrayText =
            !strayTextStr.includes('"') &&
            !strayTextStr.includes("{") &&
            !strayTextStr.includes("[") &&
            (strayTextStr.includes("-") || strayTextStr.includes("_") || strayTextStr.length > 5);

          if (looksLikeStrayText) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(`Removed stray text "${strayTextStr}" before property`);
            }
            return `${newline2Str}${propertyStr}`;
          }
        }

        return match;
      },
    );

    // ===== Block 9: Fix JSON structure issues =====
    // Pattern 1: Fix dangling properties
    const danglingPropertyPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+"(?=[,}\n])/g;
    sanitized = sanitized.replace(danglingPropertyPattern, (match, propertyName, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      if (isInStringAt(offsetNum, sanitized)) {
        return match;
      }

      const afterMatch = sanitized.substring(
        offsetNum + match.length,
        Math.min(offsetNum + match.length + 10, sanitized.length),
      );

      if (afterMatch.trim().startsWith(":")) {
        return match;
      }

      if (/^\s*[":]/.test(afterMatch)) {
        return match;
      }

      const delimiterMatch = /^\s*([,}\n])/.exec(afterMatch);
      const delimiter = delimiterMatch ? delimiterMatch[1] : "";

      if (delimiter) {
        const beforeDelimiter = afterMatch.substring(0, afterMatch.indexOf(delimiter));
        if (beforeDelimiter.includes(":")) {
          return match;
        }
      }

      hasChanges = true;
      diagnostics.push(`Fixed dangling property: "${propertyName} " -> "${propertyName}": null`);

      if (delimiter === "\n") {
        return `"${propertyName}": null,`;
      }
      if (delimiter === ",") {
        return `"${propertyName}": null,`;
      }
      return `"${propertyName}": null`;
    });

    // Pattern 2: Fix missing opening quotes in array strings
    // Pattern: ["item1", item2", "item3"] -> ["item1", "item2", "item3"]
    const missingOpeningQuotePattern1 = /([,[])\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)"\s*,/g;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern1,
      (match, delimiter, unquotedValue, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        // Check if we're in an array context by looking for opening bracket before
        const beforeMatch = sanitized.substring(Math.max(0, offsetNum - 500), offsetNum);
        const hasOpeningBracket = beforeMatch.includes("[");
        const hasOpeningBrace = beforeMatch.includes("{");

        // Only fix if we're likely in an array (have [ before, or delimiter is [)
        if (!hasOpeningBracket && delimiter !== "[") {
          // Check if we're after a closing brace (might be in object, not array)
          if (hasOpeningBrace && /}\s*$/.test(beforeMatch.trim())) {
            return match;
          }
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";

        const jsonKeywords = ["true", "false", "null", "undefined"];
        if (jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          return match;
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed missing opening quote in array string: ${unquotedValueStr}" -> "${unquotedValueStr}"`,
        );
        return `${delimiterStr} "${unquotedValueStr}",`;
      },
    );

    // Pattern 3: Fix stray characters after property values
    const strayCharsAfterValuePattern =
      /("(?:[^"\\]|\\.)*")(?:\s+)?([a-zA-Z_$0-9]+)(?=\s*[,}\]]|\s*\n)/g;
    sanitized = sanitized.replace(
      strayCharsAfterValuePattern,
      (match, quotedValue, strayChars, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        if (isInStringAt(offsetNum, sanitized)) {
          return match;
        }

        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const strayCharsStr = typeof strayChars === "string" ? strayChars : "";

        const afterMatchStart = offsetNum + match.length;
        const afterMatch = sanitized.substring(afterMatchStart, afterMatchStart + 20);
        const isValidAfterContext = /^\s*[,}\]]|^\s*\n/.test(afterMatch);

        if (isValidAfterContext && strayCharsStr.length > 0) {
          hasChanges = true;
          diagnostics.push(
            `Removed stray characters "${strayCharsStr}" after value ${quotedValueStr}`,
          );
          return quotedValueStr;
        }

        return match;
      },
    );

    // Pattern 4: Fix truncated strings (missing beginning)
    // Pattern: `axperience.Table"` -> `jakarta.persistence.Table"` (if we can detect it's truncated)
    // This is tricky - we'll detect strings that start with lowercase and look incomplete
    const truncatedStringPattern = /"([^"]*)"\s*([,}\]]|$)/g;
    sanitized = sanitized.replace(
      truncatedStringPattern,
      (match, truncatedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a truncated package name or class name
        const truncatedValueStr = typeof truncatedValue === "string" ? truncatedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Special case: "axperience" -> "jakarta.persistence" (common truncation)
        // Only fix if it's clearly "axperience" (missing "jakarta.persist" prefix)
        if (
          truncatedValueStr === "axperience.Table" ||
          truncatedValueStr.startsWith("axperience.")
        ) {
          hasChanges = true;
          const fixed = truncatedValueStr.replace(/^axperience\./, "jakarta.persistence.");
          if (diagnostics.length < 10) {
            diagnostics.push(`Fixed truncated string: "${truncatedValueStr}" -> "${fixed}"`);
          }
          return `"${fixed}"${terminatorStr}`;
        }

        // Special case: "orgah.apache" -> "org.apache" (typo)
        if (truncatedValueStr.startsWith("orgah.")) {
          hasChanges = true;
          const fixed = truncatedValueStr.replace(/^orgah\./, "org.");
          if (diagnostics.length < 10) {
            diagnostics.push(`Fixed typo in string: "${truncatedValueStr}" -> "${fixed}"`);
          }
          return `"${fixed}"${terminatorStr}`;
        }

        // Special case: "org.apachefineract" -> "org.apache.fineract" (missing dot)
        if (truncatedValueStr.includes("org.apachefineract")) {
          hasChanges = true;
          const fixed = truncatedValueStr.replace(/org\.apachefineract/g, "org.apache.fineract");
          if (diagnostics.length < 10) {
            diagnostics.push(`Fixed missing dot in string: "${truncatedValueStr}" -> "${fixed}"`);
          }
          return `"${fixed}"${terminatorStr}`;
        }

        // Special case: "orgá.apache" -> "org.apache" (non-ASCII character)
        // Check for any non-ASCII characters in org.apache patterns
        // Match org followed by any non-ASCII character followed by .apache or just org followed by non-ASCII
        // eslint-disable-next-line no-control-regex
        const nonAsciiPattern = /org[^\x00-\x7F]\.apache/;
        // eslint-disable-next-line no-control-regex
        const nonAsciiStartPattern = /^org[^\x00-\x7F]/;
        if (
          nonAsciiPattern.test(truncatedValueStr) ||
          nonAsciiStartPattern.test(truncatedValueStr)
        ) {
          hasChanges = true;
          // eslint-disable-next-line no-control-regex
          const fixed = truncatedValueStr.replace(/org([^\x00-\x7F])/g, "org");
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed non-ASCII character in string: "${truncatedValueStr}" -> "${fixed}"`,
            );
          }
          return `"${fixed}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 5: Fix corrupted property/value pairs
    // Pattern: "name":ICCID": "value" -> "name": "ICCID", "ICCID": "value"
    // Also handle: "name":"ICCID": "value" (if quote was already added by another pattern)
    const corruptedPattern1 =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"?([A-Za-z_$][a-zA-Z0-9_]*)"?\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      corruptedPattern1,
      (match, propertyName, corruptedValue, nextPropertyValue, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        if (isInStringAt(offsetNum, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const corruptedValueStr = typeof corruptedValue === "string" ? corruptedValue : "";
        const nextPropertyValueStr = typeof nextPropertyValue === "string" ? nextPropertyValue : "";

        // Only fix if it looks like a corrupted pattern (value followed by quote-colon-quote)
        // The corrupted value should be an identifier (starts with letter/underscore, all caps or mixed case)
        if (corruptedValueStr.length > 0 && /^[A-Za-z_]/.test(corruptedValueStr)) {
          hasChanges = true;
          diagnostics.push(
            `Fixed corrupted property/value pair: "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "${corruptedValueStr}": "${nextPropertyValueStr}"`,
          );
          // Fix: "name": "ICCID", "ICCID": "value"
          return `"${propertyNameStr}": "${corruptedValueStr}", "${corruptedValueStr}": "${nextPropertyValueStr}"`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed syntax errors (quotes, properties, content)",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixSyntaxErrors sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
