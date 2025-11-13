/**
 * Barrel export for all JSON sanitizers.
 */
export { normalizeCharacters } from "./normalize-characters";
export { stripWrappers } from "./strip-wrappers";
export { fixStructuralErrors } from "./fix-structural-errors";
export { fixSyntaxErrors } from "./fix-syntax-errors";

export type { Sanitizer, SanitizerResult, PostParseTransform } from "./sanitizers-types";

// Export sanitization step constants
export {
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
  INSIGNIFICANT_SANITIZATION_STEPS,
  type SanitizationStepDescription,
} from "../constants/sanitization-steps.config";

// Export sanitization analysis utilities
export { hasSignificantSanitizationSteps } from "./sanitization-analysis";
