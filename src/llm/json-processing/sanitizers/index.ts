/**
 * Barrel export for all JSON sanitizers.
 */
// Consolidated sanitizers (primary API)
export { fixJsonStructureAndNoise } from "./structural-sanitizer";
export { fixJsonSyntax } from "./syntax-sanitizer";

// Individual sanitizers (still available for specific use cases)
export { normalizeCharacters } from "./normalize-characters";
export { fixJsonStructure } from "./fix-json-structure";
export { unifiedSyntaxSanitizer } from "./unified-syntax-sanitizer";
export { fixBinaryCorruptionPatterns } from "./fix-binary-corruption-patterns";
export { fixHeuristicJsonErrors } from "./fix-heuristic-json-errors";
export { fixMalformedJsonPatterns } from "./fix-malformed-json-patterns";

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
