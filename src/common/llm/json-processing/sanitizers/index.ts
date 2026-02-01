/**
 * Barrel export for all JSON sanitizers.
 */
// Consolidated sanitizers (primary API)
export { sanitizeJsonStructure } from "./structural-sanitizer.js";
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

// Export repair step constants (sanitization + transform repairs)
export {
  REPAIR_STEP,
  REPAIR_STEP_TEMPLATE,
  INSIGNIFICANT_REPAIR_STEPS,
} from "../constants/repair-steps.config.js";

// Export repair analysis utilities
export { hasSignificantRepairs } from "../utils/repair-analysis.js";
