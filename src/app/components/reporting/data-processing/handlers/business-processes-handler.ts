import { createCategoryHandler } from "./handler-factory";
import { isBusinessProcessesArray } from "../category-data-type-guards";

/**
 * Handler for business processes category data.
 * Uses the factory pattern with the BusinessProcessesArray type guard.
 */
export const businessProcessesHandler = createCategoryHandler(
  "businessProcesses",
  isBusinessProcessesArray,
);
