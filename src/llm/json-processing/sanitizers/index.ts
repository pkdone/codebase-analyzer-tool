/**
 * Barrel export for all JSON sanitizers.
 */
export { trimWhitespace } from "./trim-whitespace";
export { removeCodeFences } from "./remove-code-fences";
export { normalizeEscapeSequences } from "./normalize-escape-sequences";
export { removeInvalidPrefixes } from "./remove-invalid-prefixes";
export { extractLargestJsonSpan } from "./extract-largest-json-span";
export { collapseDuplicateJsonObject } from "./collapse-duplicate-json-object";
export { fixMismatchedDelimiters } from "./fix-mismatched-delimiters";
export { fixMissingArrayObjectBraces } from "./fix-missing-array-object-braces";
export { addMissingPropertyCommas } from "./add-missing-property-commas";
export { removeTrailingCommas } from "./remove-trailing-commas";
export { concatenationChainSanitizer } from "./fix-concatenation-chains";
export { completeTruncatedStructures } from "./complete-truncated-structures";
export { fixPropertyNames } from "./fix-property-names";
export { fixUndefinedValues } from "./fix-undefined-values";
export { fixUnescapedQuotesInStrings } from "./fix-unescaped-quotes-in-strings";
export { fixStrayCharsAfterPropertyValues } from "./fix-stray-chars-after-property-values";
export { removeTruncationMarkers } from "./remove-truncation-markers";
export { normalizePropertyAssignment } from "./normalize-property-assignment";
export { fixCurlyQuotes } from "./fix-curly-quotes";
export { fixBinaryCorruptionPatterns } from "./fix-binary-corruption-patterns";
export { fixMissingOpeningQuoteInArrayStrings } from "./fix-missing-opening-quote-in-array-strings";
export { fixCorruptedNumericValues } from "./fix-corrupted-numeric-values";
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
