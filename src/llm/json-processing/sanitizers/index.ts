/**
 * Barrel export for all JSON sanitizers.
 */
export { trimWhitespace } from "./trim-whitespace";
export { removeCodeFences } from "./remove-code-fences";
export { normalizeCharacters } from "./normalize-characters";
export { removeInvalidPrefixes } from "./remove-invalid-prefixes";
export { extractLargestJsonSpan } from "./extract-largest-json-span";
export { collapseDuplicateJsonObject } from "./collapse-duplicate-json-object";
export { fixJsonStructure } from "./fix-json-structure";
export { fixPropertyAndValueSyntax } from "./fix-property-and-value-syntax";
export { fixMissingArrayObjectBraces } from "./fix-missing-array-object-braces";
export { fixStrayCharsAfterPropertyValues } from "./fix-stray-chars-after-property-values";
export { removeTruncationMarkers } from "./remove-truncation-markers";
export { fixBinaryCorruptionPatterns } from "./fix-binary-corruption-patterns";
export { fixMissingOpeningQuoteInArrayStrings } from "./fix-missing-opening-quote-in-array-strings";
export { fixDanglingProperties } from "./fix-dangling-properties";
export { fixTruncatedValueInArrayElements } from "./fix-truncated-value-in-array-elements";
export { fixCorruptedPropertyValuePairs } from "./fix-corrupted-property-value-pairs";

export type { Sanitizer, SanitizerResult, PostParseTransform } from "./sanitizers-types";

// Export sanitization step constants
export {
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
  INSIGNIFICANT_SANITIZATION_STEPS,
  type SanitizationStepDescription,
} from "../config/sanitization-steps.config";

// Export sanitization analysis utilities
export { hasSignificantSanitizationSteps } from "./sanitization-analysis";
