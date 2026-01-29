import type { CategoryDataHandler } from "./category-handler.interface";
import type { CategorizedSectionItem } from "../category-data-type-guards";
import { isPotentialMicroservicesArray } from "../category-data-type-guards";

/**
 * Handler for potential microservices category data.
 */
export const potentialMicroservicesHandler: CategoryDataHandler = {
  category: "potentialMicroservices",

  process(label: string, fieldData: unknown): CategorizedSectionItem | null {
    return {
      category: "potentialMicroservices",
      label,
      data: isPotentialMicroservicesArray(fieldData) ? fieldData : [],
    };
  },
};
