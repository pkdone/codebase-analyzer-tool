import { injectable } from "tsyringe";
import { z } from "zod";
import { getCategoryLabel } from "../../../../config/category-labels.config";
import {
  AppSummaryCategories,
  nameDescSchema,
  inferredArchitectureSchema,
} from "../../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../../insights/insights.types";
import type {
  AppSummaryNameDescArray,
  AppSummaryRecordWithId,
} from "../../../../repositories/app-summaries/app-summaries.model";

// Zod schema for validating AppSummaryNameDescArray
const appSummaryNameDescArraySchema = z.array(nameDescSchema);

// Schema for the inner inferredArchitecture object (unwrapped from the wrapper)
const inferredArchitectureInnerSchema = inferredArchitectureSchema.shape.inferredArchitecture;

/**
 * Type for the inferred architecture data extracted from Zod schema.
 */
type InferredArchitectureInner = z.infer<typeof inferredArchitectureInnerSchema>;

/**
 * Union type for categorized data that accommodates both standard name-description arrays
 * and inferred architecture data structures.
 */
export type CategorizedDataItem = AppSummaryNameDescArray | InferredArchitectureInner[];

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 * Uses Zod schema validation for robust type checking.
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return appSummaryNameDescArraySchema.safeParse(data).success;
}

/**
 * Type guard to check if a value is InferredArchitectureInner[]
 */
function isInferredArchitectureInnerArray(data: unknown): data is InferredArchitectureInner[] {
  if (!Array.isArray(data)) {
    return false;
  }
  if (data.length === 0) {
    return true; // Empty array is valid
  }
  // Check if the first element matches the inferred architecture schema
  return inferredArchitectureInnerSchema.safeParse(data[0]).success;
}

/**
 * Type guard to check if categorized data item is AppSummaryNameDescArray
 */
export function isCategorizedDataNameDescArray(
  data: CategorizedDataItem,
): data is AppSummaryNameDescArray {
  return isAppSummaryNameDescArray(data);
}

/**
 * Type guard to check if categorized data item is InferredArchitectureInner[]
 */
export function isCategorizedDataInferredArchitecture(
  data: CategorizedDataItem,
): data is InferredArchitectureInner[] {
  return isInferredArchitectureInnerArray(data);
}

/**
 * Type guard to check if a value is a valid inferred architecture object.
 * Returns the parsed data if valid, or null if invalid.
 */
function parseInferredArchitectureData(data: unknown): InferredArchitectureInner | null {
  const result = inferredArchitectureInnerSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Wraps the validated inferred architecture data in an array for compatibility with
 * the categorizedData interface. The VisualizationsSection will use its own type guard
 * to validate the structure when extracting the data.
 */
function wrapInferredArchitectureAsArray(
  validatedData: InferredArchitectureInner,
): InferredArchitectureInner[] {
  // The data is validated by Zod schema; we wrap it in an array for interface compatibility
  // The consuming code (VisualizationsSection) validates this structure with its own type guard
  return [validatedData];
}

/**
 * Data provider responsible for aggregating app summary categorized data for reports.
 */
@injectable()
export class AppSummaryCategoriesProvider {
  /**
   * Build categorized data for standard (tabular) categories using pre-fetched app summary data.
   * Excludes categories that have custom dedicated sections in the report.
   */
  getStandardSectionData(
    appSummaryData: Pick<AppSummaryRecordWithId, AppSummaryCategoryType>,
  ): { category: string; label: string; data: CategorizedDataItem }[] {
    // Exclude appDescription which is rendered separately in the overview section
    // Note: boundedContexts is included here because the DomainModelDataProvider needs it
    const standardCategoryKeys = AppSummaryCategories.options.filter(
      (key): key is AppSummaryCategoryType => key !== "appDescription",
    );
    return standardCategoryKeys.map((category: AppSummaryCategoryType) => {
      const label = getCategoryLabel(category);
      const fieldData = appSummaryData[category];

      // Handle inferredArchitecture specially - it's an object, not an array
      // Wrap it in an array so it can be processed by VisualizationsSection
      let data: CategorizedDataItem;
      if (category === "inferredArchitecture") {
        const parsedArchData = parseInferredArchitectureData(fieldData);
        data = parsedArchData !== null ? wrapInferredArchitectureAsArray(parsedArchData) : [];
      } else {
        data = isAppSummaryNameDescArray(fieldData) ? fieldData : [];
      }

      console.log(`Generated ${label} table`);
      return {
        category,
        label,
        data,
      };
    });
  }
}
