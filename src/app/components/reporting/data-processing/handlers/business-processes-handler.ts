import type { CategoryDataHandler } from "./category-handler.interface";
import type { CategorizedSectionItem } from "../category-data-type-guards";
import { isBusinessProcessesArray } from "../category-data-type-guards";

/**
 * Handler for business processes category data.
 */
export const businessProcessesHandler: CategoryDataHandler = {
  category: "businessProcesses",

  process(label: string, fieldData: unknown): CategorizedSectionItem | null {
    return {
      category: "businessProcesses",
      label,
      data: isBusinessProcessesArray(fieldData) ? fieldData : [],
    };
  },
};
