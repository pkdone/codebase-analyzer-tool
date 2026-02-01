import { createCategoryHandler } from "./handler-factory";
import { isBoundedContextsArray } from "../category-data-type-guards";

/**
 * Handler for bounded contexts category data.
 * Uses the factory pattern with the BoundedContextsArray type guard.
 */
export const boundedContextsHandler = createCategoryHandler(
  "boundedContexts",
  isBoundedContextsArray,
);
