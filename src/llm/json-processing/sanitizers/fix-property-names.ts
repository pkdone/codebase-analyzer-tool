import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { DELIMITERS } from "../config/json-processing.config";

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
 * This merges mappings from:
 * - fix-truncated-property-names.ts
 * - fix-property-name-typos.ts
 * - fix-unquoted-property-typos.ts
 * - fix-tail-end-truncated-properties.ts
 * - fix-truncated-property-names-after-brace.ts
 */
const PROPERTY_NAME_MAPPINGS: Record<string, string> = {
  // === General truncations (from fix-truncated-property-names.ts) ===
  eferences: "references",
  refere: "references",
  refer: "references",
  se: "name",
  nam: "name",
  na: "name",
  alues: "publicMethods",
  lues: "publicMethods",
  ues: "publicMethods",
  es: "publicMethods",
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

  // === Single character mappings ===
  e: "name",
  n: "name",
  m: "name",

  // === Two character mappings ===
  am: "name",
  me: "name",

  // === Unquoted property typos (from fix-unquoted-property-typos.ts) ===
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

  // === Tail-end truncations (from fix-tail-end-truncated-properties.ts) ===
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

  // === Truncations after brace (from fix-truncated-property-names-after-brace.ts) ===
  // Note: Some truncations are already defined above, so we only add unique ones here
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
 * Known property name typo corrections for quoted properties (from fix-property-name-typos.ts).
 * These handle trailing underscores and double underscores.
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
 * Consolidated sanitizer that fixes all property name issues in JSON responses.
 *
 * This sanitizer consolidates the functionality of 7 separate sanitizers:
 * 1. fix-unquoted-property-names.ts - Adds quotes around unquoted property names
 * 2. fix-property-name-typos.ts - Fixes typos in quoted properties (trailing underscores, double underscores)
 * 3. fix-unquoted-property-typos.ts - Fixes unquoted properties that are typos
 * 4. fix-concatenated-property-names.ts - Merges concatenated string literals in property names
 * 5. fix-tail-end-truncated-properties.ts - Fixes tail-end truncated properties
 * 6. fix-truncated-property-names.ts - Fixes various truncation patterns
 * 7. fix-truncated-property-names-after-brace.ts - Fixes truncated properties after braces
 *
 * ## Fixes Applied
 *
 * 1. **Concatenated Property Names**: Merges `"part1" + "part2":` → `"part1part2":`
 * 2. **Truncated Property Names**: Fixes truncations using comprehensive mappings
 * 3. **Unquoted Property Names**: Adds quotes around unquoted properties
 * 4. **Missing Opening Quotes**: Adds missing opening quotes (e.g., `name":` → `"name":`)
 * 5. **Missing Closing Quote and Colon**: Fixes `"name "value"` → `"name": "value"`
 * 6. **Property Name Typos**: Fixes trailing underscores, double underscores, and known typos
 * 7. **Tail-end Truncations**: Fixes truncated property endings
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with all property name issues fixed
 */
export const fixPropertyNames: Sanitizer = (input: string): SanitizerResult => {
  try {
    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pass 1: Fix concatenated property names (e.g., "part1" + "part2":)
    const concatenatedPattern = /"([^"]+)"\s*\+\s*"([^"]+)"(\s*\+\s*"[^"]+")*\s*:/g;
    sanitized = sanitized.replace(
      concatenatedPattern,
      (_match, firstPart, secondPart, additionalParts, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;

        // Check if we're inside a string value
        if (isInStringAt(numericOffset, sanitized)) {
          return _match;
        }

        const allParts: string[] = [firstPart as string, secondPart as string];

        if (additionalParts) {
          const additionalMatches = (additionalParts as string).match(/"([^"]+)"/g);
          if (additionalMatches) {
            for (const additionalMatch of additionalMatches) {
              const content = additionalMatch.slice(1, -1);
              allParts.push(content);
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

    // Pass 2: Fix property names with missing opening quotes that might be truncations/typos
    // This handles: propertyName": (where opening quote is missing)
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

          // Check if already quoted
          if (
            propertyNameStart > 0 &&
            sanitized[propertyNameStart - 1] === DELIMITERS.DOUBLE_QUOTE
          ) {
            return match;
          }

          // Check property boundary
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

          // Check if it's a known truncation/typo (try both original case and lowercase)
          let fixedName =
            PROPERTY_NAME_MAPPINGS[propertyNameStr] || PROPERTY_NAME_MAPPINGS[lowerPropertyName];
          if (!fixedName) {
            // Try without trailing underscore
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

    // Pass 3: Fix property names with missing closing quote and colon
    // This handles: "propertyName "value" → "propertyName": "value"
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

          // Check property boundary
          if (numericOffset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
            const isAfterPropertyBoundary = /[}\],][\s\n]*$/.test(beforeMatch);

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
            `Fixed property name with missing closing quote and colon: "${propertyNameStr} " -> "${propertyNameStr}":`,
          );
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Pass 4: Fix truncated property names (quoted and unquoted)
    // This handles: "eferences": → "references":
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

    // Pass 5: Fix quoted property name typos (trailing underscores, double underscores)
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

        // Check known typo corrections
        if (PROPERTY_TYPO_CORRECTIONS[propertyNameStr]) {
          fixedName = PROPERTY_TYPO_CORRECTIONS[propertyNameStr];
        }
        // Check trailing underscore
        else if (propertyNameStr.endsWith("_") && propertyNameStr.length > 1) {
          const withoutUnderscore = propertyNameStr.slice(0, -1);
          if (
            PROPERTY_TYPO_CORRECTIONS[propertyNameStr] ||
            PROPERTY_TYPO_CORRECTIONS[withoutUnderscore + "_"] ||
            withoutUnderscore.length > 2
          ) {
            fixedName = PROPERTY_TYPO_CORRECTIONS[propertyNameStr] || withoutUnderscore;
          }
        }
        // Check double underscores
        else if (propertyNameStr.includes("__")) {
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

        // Check if already quoted
        if (numericOffset > 0 && sanitized[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
          return match;
        }

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check property boundary
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

        // Check if it's a known truncation/typo (try both original case and lowercase)
        const fixedName =
          PROPERTY_NAME_MAPPINGS[propertyNameStr] ||
          PROPERTY_NAME_MAPPINGS[lowerPropertyName] ||
          propertyNameStr;

        hasChanges = true;
        diagnostics.push(`Fixed unquoted property name: ${propertyNameStr} -> ${fixedName}`);
        return `${whitespaceStr}"${fixedName}":`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed property names" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixPropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
