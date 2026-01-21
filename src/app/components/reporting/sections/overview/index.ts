/**
 * Overview section barrel exports.
 * Contains app statistics and re-exports from the data-processing module.
 */
export { AppStatisticsDataProvider } from "./app-statistics-data-provider";

// Re-export data processing utilities for backwards compatibility
// Note: Prefer importing directly from "../../data-processing" for new code
export {
  CategorizedSectionDataBuilder,
  type CategorizedSectionItem,
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
  type InferredArchitectureInner,
  type PotentialMicroservicesArray,
  type BoundedContextsArray,
  type BusinessProcessesArray,
} from "../../data-processing";

export type { AppStatistics } from "./overview.types";
