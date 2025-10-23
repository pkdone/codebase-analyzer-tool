/**
 * Barrel export for all JSON sanitizers.
 */
export { trimWhitespace } from "./trim-whitespace";
export { removeCodeFences } from "./remove-code-fences";
export { removeControlChars } from "./remove-control-chars";
export { removeStrayLinePrefixChars } from "./remove-stray-line-prefix-chars";
export { extractLargestJsonSpan } from "./extract-largest-json-span";
export { collapseDuplicateJsonObject } from "./collapse-duplicate-json-object";
export { fixMismatchedDelimiters } from "./fix-mismatched-delimiters";
export { addMissingPropertyCommas } from "./add-missing-property-commas";
export { removeTrailingCommas } from "./remove-trailing-commas";
export { concatenationChainSanitizer } from "./fix-concatenation-chains";
export { overEscapedSequencesSanitizer } from "./fix-over-escaped-sequences";
export { completeTruncatedStructures } from "./complete-truncated-structures";
export { fixTruncatedPropertyNames } from "./fix-truncated-property-names";
export { fixUndefinedValues } from "./fix-undefined-values";
export { fixUnquotedPropertyNames } from "./fix-unquoted-property-names";

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
