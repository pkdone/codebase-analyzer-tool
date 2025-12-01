/**
 * Barrel export for all schema fixing transformations.
 * Provides a unified import point for transforms.
 */

export { convertNullToUndefined } from "./convert-null-to-undefined.js";
export { convertUndefinedToString } from "./convert-undefined-to-string.js";
export { unwrapJsonSchemaStructure, coerceNumericProperties } from "./schema-format-transforms.js";
export { fixCommonPropertyNameTypos } from "./property-typo-fixes.js";
export { coerceStringToArray } from "./coerce-string-to-array.js";
