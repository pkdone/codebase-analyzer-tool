import type { CategoryDataHandler } from "./category-handler.interface";
import type { CategorizedSectionItem } from "../category-data-type-guards";
import { isAppSummaryNameDescArray } from "../category-data-type-guards";

/**
 * Handler for technologies category data.
 */
export const technologiesHandler: CategoryDataHandler = {
  category: "technologies",

  process(label: string, fieldData: unknown): CategorizedSectionItem | null {
    return {
      category: "technologies",
      label,
      data: isAppSummaryNameDescArray(fieldData) ? fieldData : [],
    };
  },
};
