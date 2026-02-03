/**
 * Barrel export for all JSON sanitizers.
 */
// Consolidated sanitizers (primary API)
export { sanitizeJsonStructure } from "./structural-sanitizer.js";
export { fixJsonSyntax } from "./syntax-sanitizer.js";

// Individual sanitizers (still available for specific use cases)
export { normalizeCharacters } from "./normalize-characters.js";
export { removeComments } from "./remove-comments.js";
export { postProcessJsonStructure } from "./post-process-json-structure.js";
export { propertyAndValueSyntaxSanitizer } from "./property-and-value-syntax-sanitizer.js";
export { fixLlmTokenArtifacts } from "./fix-llm-token-artifacts.js";
export { fixLlmArtifactPatterns } from "./fix-llm-artifact-patterns.js";
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
