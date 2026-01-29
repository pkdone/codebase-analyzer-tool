import type { CategoryDataHandler } from "./category-handler.interface";
import type { CategorizedSectionItem } from "../category-data-type-guards";
import {
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
} from "../category-data-type-guards";

/**
 * Handler for inferred architecture category data.
 */
export const inferredArchitectureHandler: CategoryDataHandler = {
  category: "inferredArchitecture",

  process(label: string, fieldData: unknown): CategorizedSectionItem | null {
    const parsedArchData = parseInferredArchitectureData(fieldData);
    return {
      category: "inferredArchitecture",
      label,
      data: parsedArchData !== null ? wrapInferredArchitectureAsArray(parsedArchData) : [],
    };
  },
};
