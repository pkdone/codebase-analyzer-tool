import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { DELIMITERS } from "../constants/json-processing.config";
import { CONCATENATION_REGEXES } from "../constants/regex.constants";

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
  "return a": "returnType",
  "return ": "returnType",
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
 * Unified sanitizer that fixes property names, property assignment syntax, and value syntax issues.
 *
 * This sanitizer combines the functionality of six separate sanitizers:
 * 1. fixPropertyNames: Fixes all property name issues (truncations, typos, unquoted, concatenated, missing quotes)
 * 2. normalizePropertyAssignment: Normalizes property assignment syntax (:= to :, stray text, unquoted values, missing quotes)
 * 3. fixUndefinedValues: Converts undefined values to null
 * 4. fixCorruptedNumericValues: Fixes corrupted numeric values like _3 -> 3
 * 5. concatenationChainSanitizer: Fixes string concatenation expressions (e.g., "BASE + '/path'")
 * 6. fixUnescapedQuotesInStrings: Escapes unescaped quotes inside string values
 *
 * ## Purpose
 * LLMs sometimes generate JSON with various property and value syntax issues:
 * - Property name issues: truncations, typos, unquoted, concatenated, missing quotes
 * - Assignment syntax: `:=` instead of `:`, stray text between colon and value
 * - Invalid literals: `undefined` values, corrupted numeric values
 * - Concatenation chains: JavaScript-style string concatenation
 * - Unescaped quotes: Quotes inside string values that break parsing
 *
 * This sanitizer handles all these issues in a single, efficient pass.
 *
 * ## Implementation
 * Applies fixes in logical order:
 * 1. Concatenation chains (fixes string concatenation expressions)
 * 2. Property names (fixes all property name issues)
 * 3. Invalid literals (undefined and corrupted numeric values)
 * 4. Property assignment (normalizes assignment syntax)
 * 5. Unescaped quotes (escapes quotes in string values)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with property and value syntax fixes applied
 */
export const unifiedSyntaxSanitizer: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

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

    // Pass 2c: Fix completely unquoted property names (e.g., `name:`, `purpose:`, `parameters:`)
    // This handles cases where property names have no quotes at all
    // Enhanced to handle more cases including arrays and objects as values
    const unquotedPropertyNamePattern =
      /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^",\n{[\]]+?)(\s*[,}])/g;
    sanitized = sanitized.replace(
      unquotedPropertyNamePattern,
      (match, prefix, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value.trim() : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const prefixStr = typeof prefix === "string" ? prefix : "";

          // Check if propertyName is a known property name
          const lowerPropertyName = propertyNameStr.toLowerCase();
          const knownProperties = [
            "name",
            "purpose",
            "description",
            "parameters",
            "returntype",
            "cyclomaticcomplexity",
            "linesofcode",
            "codesmells",
            "type",
            "value",
            "returnType",
            "cyclomaticComplexity",
            "linesOfCode",
            "codeSmells",
          ];

          // Also check if it looks like a property name (camelCase or lowercase)
          const looksLikePropertyName =
            /^[a-z][a-zA-Z0-9_$]*$/.test(propertyNameStr) &&
            (knownProperties.includes(lowerPropertyName) || lowerPropertyName.length > 2);

          if (looksLikePropertyName) {
            hasChanges = true;
            // Determine if value needs quotes (if it's not a number, boolean, null, or already quoted)
            let quotedValue = valueStr;
            if (
              !/^(true|false|null|\d+)$/.test(valueStr) &&
              !valueStr.startsWith('"') &&
              !valueStr.startsWith("[") &&
              !valueStr.startsWith("{")
            ) {
              quotedValue = `"${valueStr}"`;
            }

            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed unquoted property name: ${propertyNameStr}: ${valueStr} -> "${propertyNameStr}": ${quotedValue}`,
              );
            }
            return `${prefixStr}"${propertyNameStr}": ${quotedValue}${terminatorStr}`;
          }
        }

        return match;
      },
    );

    // Pass 2c.1: Fix unquoted property names followed by arrays or objects
    // Pattern: `parameters: [` -> `"parameters": [`
    // Pattern: `codeSmells: [` -> `"codeSmells": [`
    const unquotedPropertyNameWithArrayPattern =
      /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(\[|\{)/g;
    sanitized = sanitized.replace(
      unquotedPropertyNameWithArrayPattern,
      (match, prefix, propertyName, bracket, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const bracketStr = typeof bracket === "string" ? bracket : "";
          const prefixStr = typeof prefix === "string" ? prefix : "";

          // Check if it looks like a property name
          const looksLikePropertyName = /^[a-z][a-zA-Z0-9_$]*$/.test(propertyNameStr);

          if (looksLikePropertyName) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed unquoted property name with array/object: ${propertyNameStr}: ${bracketStr} -> "${propertyNameStr}": ${bracketStr}`,
              );
            }
            return `${prefixStr}"${propertyNameStr}": ${bracketStr}`;
          }
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

    // ===== Block 2.5: Fix missing quotes around array string elements =====
    // Pattern: Missing opening quote before string in array (e.g., `org.apache\"...` -> `"org.apache\"...`)
    // This handles cases where array elements are missing opening quotes
    const missingQuoteInArrayPattern = /(\[|,\s*)(\s*)([a-zA-Z][a-zA-Z0-9_.]*)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      missingQuoteInArrayPattern,
      (match, prefix, whitespace, unquotedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

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

        if (foundArray || prefixStr === "[") {
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(
              `Fixed missing opening quote in array element: ${unquotedValueStr}" -> "${unquotedValueStr}"`,
            );
          }
          return `${prefixStr}${whitespaceStr}"${unquotedValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Block 2.5b: Fix words before quoted strings in arrays =====
    // Pattern: `from "org.apache..."` or `stop"org.springframework..."` -> `"org.apache..."` or `"org.springframework..."`
    // This handles cases where a word prefix appears before a quoted string in an array
    // Handles both with space (`from "org...`) and without space (`stop"org...`)
    // Note: \s* matches zero or more spaces, so it handles both cases
    const wordBeforeQuotedStringInArrayPattern =
      /(\[|,\s*)(\s*)([a-zA-Z]+)\s*"([^"]+)"(\s*,|\s*\])/g;
    // Also handle case where word is directly concatenated to quote (no space): `stop"org...`
    const wordDirectlyBeforeQuotePattern = /(\[|,\s*)(\s*)([a-zA-Z]+)"([^"]+)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      wordBeforeQuotedStringInArrayPattern,
      (match, prefix, whitespace, prefixWord, quotedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const prefixWordStr = typeof prefixWord === "string" ? prefixWord : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

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

        // Common prefix words that should be removed (like "from", "stop", etc.)
        const prefixWordsToRemove = ["from", "stop", "package", "import"];
        const lowerPrefixWord = prefixWordStr.toLowerCase();

        // Check if we're in an array: prefix is "[" or starts with ",", or we found an array by scanning backwards
        const isInArray = prefixStr === "[" || prefixStr.startsWith(",") || foundArray;

        if (isInArray && prefixWordsToRemove.includes(lowerPrefixWord)) {
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(
              `Removed prefix word '${prefixWordStr}' before quoted string in array: ${prefixWordStr} "${quotedValueStr}" -> "${quotedValueStr}"`,
            );
          }
          return `${prefixStr}${whitespaceStr}"${quotedValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Also handle case where word is directly concatenated to quote (no space): `stop"org...`
    sanitized = sanitized.replace(
      wordDirectlyBeforeQuotePattern,
      (match, prefix, whitespace, prefixWord, quotedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const prefixWordStr = typeof prefixWord === "string" ? prefixWord : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

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

        // Common prefix words that should be removed (like "from", "stop", etc.)
        const prefixWordsToRemove = ["from", "stop", "package", "import"];
        const lowerPrefixWord = prefixWordStr.toLowerCase();

        // Check if we're in an array: prefix is "[" or starts with ",", or we found an array by scanning backwards
        const isInArray = prefixStr === "[" || prefixStr.startsWith(",") || foundArray;

        if (isInArray && prefixWordsToRemove.includes(lowerPrefixWord)) {
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(
              `Removed prefix word '${prefixWordStr}' directly before quoted string in array: ${prefixWordStr}"${quotedValueStr}" -> "${quotedValueStr}"`,
            );
          }
          return `${prefixStr}${whitespaceStr}"${quotedValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Block 2.6: Fix unquoted property names followed by array/object =====
    // Pattern: `parameters: [` or `parameters: {` -> `"parameters": [` or `"parameters": {`
    const unquotedPropertyBeforeStructurePattern =
      /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([[{])/g;
    sanitized = sanitized.replace(
      unquotedPropertyBeforeStructurePattern,
      (match, prefix, propertyName, structureStart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const structureStartStr = typeof structureStart === "string" ? structureStart : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isPropertyContext) {
          const lowerPropertyName = propertyNameStr.toLowerCase();
          const knownProperties = [
            "name",
            "purpose",
            "description",
            "parameters",
            "returntype",
            "cyclomaticcomplexity",
            "linesofcode",
            "codesmells",
            "type",
            "value",
            "internalreferences",
            "externalreferences",
            "publicconstants",
            "publicmethods",
            "integrationpoints",
            "databaseintegration",
            "codequalitymetrics",
          ];

          if (knownProperties.includes(lowerPropertyName)) {
            hasChanges = true;
            if (diagnostics.length < 20) {
              diagnostics.push(
                `Fixed unquoted property name before structure: ${propertyNameStr}: -> "${propertyNameStr}":`,
              );
            }
            return `${prefixStr}"${propertyNameStr}": ${structureStartStr}`;
          }
        }

        return match;
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

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed property and value syntax",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`unifiedSyntaxSanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
