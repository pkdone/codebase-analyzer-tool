import { createCategoryHandler } from "./handler-factory";
import { isAppSummaryNameDescArray } from "../category-data-type-guards";

/**
 * Handler for technologies category data.
 * Uses the factory pattern with the AppSummaryNameDescArray type guard.
 */
export const technologiesHandler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
