/**
 * Overview section barrel exports.
 * Contains app statistics, categorized data builder, and category type utilities.
 */
export { AppStatisticsDataProvider } from "./app-statistics-data-provider";
export {
  CategorizedSectionDataBuilder,
  type CategorizedDataItem,
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
} from "./categorized-section-data-builder";
export {
  isAppSummaryNameDescArray,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
  type InferredArchitectureInner,
} from "./category-data-type-guards";
export type { AppStatistics } from "./overview.types";
