/**
 * Barrel export for all JSON sanitizers.
 */
export { trimWhitespace } from "./trim-whitespace";
export { removeCodeFences } from "./remove-code-fences";
export { normalizeCharacters } from "./normalize-characters";
export { removeInvalidPrefixes } from "./remove-invalid-prefixes";
export { extractLargestJsonSpan } from "./extract-largest-json-span";
export { collapseDuplicateJsonObject } from "./collapse-duplicate-json-object";
export { addMissingCommas } from "./add-missing-commas";
export { removeTrailingCommas } from "./remove-trailing-commas";
export { fixMismatchedDelimiters } from "./fix-mismatched-delimiters";
export { completeTruncatedStructures } from "./complete-truncated-structures";
export { fixJsonStructure } from "./fix-json-structure";
export { fixPropertyAndValueSyntax } from "./fix-property-and-value-syntax";
export { fixMissingArrayObjectBraces } from "./fix-missing-array-object-braces";
export { removeTruncationMarkers } from "./remove-truncation-markers";
export { fixBinaryCorruptionPatterns } from "./fix-binary-corruption-patterns";

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
