/**
 * Barrel export for all JSON sanitizers.
 */
// Consolidated sanitizers (primary API)
export { fixJsonStructureAndNoise } from "./generic/structural-sanitizer.js";
export { fixJsonSyntax } from "./generic/syntax-sanitizer.js";

// Individual sanitizers (still available for specific use cases)
export { normalizeCharacters } from "./generic/normalize-characters.js";
export { fixJsonStructure } from "./generic/fix-json-structure.js";
export { unifiedSyntaxSanitizer } from "./generic/unified-syntax-sanitizer.js";
export { fixBinaryCorruptionPatterns } from "./generic/fix-binary-corruption-patterns.js";
export { fixHeuristicJsonErrors } from "./generic/fix-heuristic-json-errors.js";
export { fixMalformedJsonPatterns } from "./generic/fix-malformed-json-patterns.js";

export type { Sanitizer, SanitizerResult, PostParseTransform } from "./sanitizers-types.js";

// Export sanitization step constants
export {
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
  INSIGNIFICANT_SANITIZATION_STEPS,
  type SanitizationStepDescription,
} from "../constants/sanitization-steps.config.js";

// Export sanitization analysis utilities
export { hasSignificantSanitizationSteps } from "./sanitization-analysis.js";
