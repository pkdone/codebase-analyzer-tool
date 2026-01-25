/**
 * Data processing module for report generation.
 *
 * This module contains utilities for transforming and validating app summary data
 * into formats suitable for report sections and visualizations.
 */

// Main builder class
export { CategorizedSectionDataBuilder } from "./categorized-section-data-builder";

// Re-export types and type guards from categorized section data builder
export type {
  CategorizedSectionItem,
  BoundedContextsArray,
} from "./categorized-section-data-builder";
export {
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
} from "./categorized-section-data-builder";

// Re-export additional types from type guards
export type {
  InferredArchitectureInner,
  PotentialMicroservicesArray,
  BusinessProcessesArray,
} from "./category-data-type-guards";

// Visualization data extractors (general-purpose utilities)
export {
  extractKeyBusinessActivities,
  extractMicroserviceFields,
} from "./visualization-data-extractors";

// Note: extractMicroservicesData and extractInferredArchitectureData have been
// moved to sections/visualizations/ where they are consumed, following the
// principle of colocation.
