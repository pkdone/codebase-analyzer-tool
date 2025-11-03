/**
 * Barrel export for all JSON sanitizers.
 */
export { trimWhitespace } from "./trim-whitespace";
export { removeCodeFences } from "./remove-code-fences";
export { removeControlChars } from "./remove-control-chars";
export { removeThoughtMarkers } from "./remove-thought-markers";
export { removeStrayLinePrefixChars } from "./remove-stray-line-prefix-chars";
export { extractLargestJsonSpan } from "./extract-largest-json-span";
export { collapseDuplicateJsonObject } from "./collapse-duplicate-json-object";
export { fixMismatchedDelimiters } from "./fix-mismatched-delimiters";
export { fixMissingOpeningBraces } from "./fix-missing-opening-braces";
export { fixConcatenatedPropertyNames } from "./fix-concatenated-property-names";
export { addMissingPropertyCommas } from "./add-missing-property-commas";
export { removeTrailingCommas } from "./remove-trailing-commas";
export { concatenationChainSanitizer } from "./fix-concatenation-chains";
export { overEscapedSequencesSanitizer } from "./fix-over-escaped-sequences";
export { fixInvalidEscapeSequencesSanitizer } from "./fix-invalid-escape-sequences";
export { completeTruncatedStructures } from "./complete-truncated-structures";
export { fixTruncatedPropertyNames } from "./fix-truncated-property-names";
export { fixUndefinedValues } from "./fix-undefined-values";
export { fixUnescapedQuotesInStrings } from "./fix-unescaped-quotes-in-strings";
export { fixStrayTextBeforePropertyNames } from "./fix-stray-text-before-property-names";
export { fixStrayTextBeforeUnquotedProperties } from "./fix-stray-text-before-unquoted-properties";
export { fixStrayCharsAfterPropertyValues } from "./fix-stray-chars-after-property-values";
export { removeStrayLinesBetweenStructures } from "./remove-stray-lines-between-structures";
export { removeTruncationMarkers } from "./remove-truncation-markers";
export { fixAssignmentSyntax } from "./fix-assignment-syntax";
export { fixUnquotedPropertyNames } from "./fix-unquoted-property-names";
export { fixPropertyNameTypos } from "./fix-property-name-typos";
export { fixTruncatedArrayElements } from "./fix-truncated-array-elements";
export { fixCorruptedArrayObjectStart } from "./fix-corrupted-array-object-start";
export { fixUnquotedStringValues } from "./fix-unquoted-string-values";
export { fixStrayTextBetweenColonAndValue } from "./fix-stray-text-between-colon-and-value";
export { fixTailEndTruncatedProperties } from "./fix-tail-end-truncated-properties";
export { fixUnquotedPropertyTypos } from "./fix-unquoted-property-typos";

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
