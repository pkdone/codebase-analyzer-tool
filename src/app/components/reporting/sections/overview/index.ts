/**
 * Overview section barrel exports.
 * Contains app statistics, categorized data builder, and category type utilities.
 */
export { AppStatisticsDataProvider } from "./app-statistics-data-provider";
export {
  CategorizedSectionDataBuilder,
  type CategorizedSectionItem,
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
} from "./categorized-section-data-builder";
export {
  isAppSummaryNameDescArray,
  isPotentialMicroservicesArray,
  isBoundedContextsArray,
  isBusinessProcessesArray,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
  type InferredArchitectureInner,
  type PotentialMicroservicesArray,
  type BoundedContextsArray,
  type BusinessProcessesArray,
} from "./category-data-type-guards";
export type { AppStatistics } from "./overview.types";
