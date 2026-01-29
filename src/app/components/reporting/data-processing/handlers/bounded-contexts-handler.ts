import type { CategoryDataHandler } from "./category-handler.interface";
import type { CategorizedSectionItem } from "../category-data-type-guards";
import { isBoundedContextsArray } from "../category-data-type-guards";

/**
 * Handler for bounded contexts category data.
 */
export const boundedContextsHandler: CategoryDataHandler = {
  category: "boundedContexts",

  process(label: string, fieldData: unknown): CategorizedSectionItem | null {
    return {
      category: "boundedContexts",
      label,
      data: isBoundedContextsArray(fieldData) ? fieldData : [],
    };
  },
};
