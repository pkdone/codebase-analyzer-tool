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
      const missingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s*:/g;
      sanitized = sanitized.replace(
        missingOpeningQuotePattern,
        (match, whitespace, propertyName, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const lowerPropertyName = propertyNameStr.toLowerCase();
          const propertyNameStart = numericOffset + whitespaceStr.length;

          if (
            propertyNameStart > 0 &&
            sanitized[propertyNameStart - 1] === DELIMITERS.DOUBLE_QUOTE
          ) {
            return match;
          }

          let isAfterPropertyBoundary = false;
          if (numericOffset > 0) {
            const beforeMatch = sanitized.substring(
              Math.max(0, numericOffset - 200),
              numericOffset,
            );
            isAfterPropertyBoundary =
              /[}\],]\s*$/.test(beforeMatch) || /[}\],]\s*\n\s*$/.test(beforeMatch);
          }

          if (!isAfterPropertyBoundary && isInStringAt(propertyNameStart, sanitized)) {
            return match;
          }

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
          diagnostics.push(
            `Fixed property name with missing opening quote: ${propertyNameStr}" -> "${fixedName}"`,
          );
          return `${whitespaceStr}"${fixedName}":`;
        },
      );
    }

    // Pass 2b: Fix very short property names with missing opening quotes (e.g., `e": "retrieveOne",` -> `"name": "retrieveOne",`)
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
          diagnostics.push(
            `Fixed property name with missing colon: "${propertyNameStr} " -> "${propertyNameStr}": "${valueStr}"`,
          );
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

        if (isInStringAt(numericOffset, sanitized)) {
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

        if (isInStringAt(numericOffset, sanitized)) {
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

    // Pattern 4: Fix corrupted property/value pairs
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
