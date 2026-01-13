/**
 * Barrel export for all JSON sanitizers.
 */
// Consolidated sanitizers (primary API)
export { fixJsonStructureAndNoise } from "./structural-sanitizer.js";
export { fixJsonSyntax } from "./syntax-sanitizer.js";

// Individual sanitizers (still available for specific use cases)
export { normalizeCharacters } from "./normalize-characters.js";
export { removeComments } from "./remove-comments.js";
export { fixJsonStructure } from "./fix-json-structure.js";
export { unifiedSyntaxSanitizer } from "./unified-syntax-sanitizer.js";
export { fixLlmTokenArtifacts } from "./fix-llm-token-artifacts.js";
export { fixHeuristicJsonErrors } from "./fix-heuristic-json-errors.js";
export { fixMalformedJsonPatterns } from "./fix-malformed-json-patterns.js";

export type { Sanitizer, SanitizerResult, SchemaFixingTransform } from "./sanitizers-types.js";

// Export mutation step constants (sanitization + transform steps)
export {
  MUTATION_STEP,
  MUTATION_STEP_TEMPLATE,
  INSIGNIFICANT_MUTATION_STEPS,
} from "../constants/mutation-steps.config.js";

// Export mutation analysis utilities
export { hasSignificantMutationSteps } from "../utils/mutation-analysis.js";
