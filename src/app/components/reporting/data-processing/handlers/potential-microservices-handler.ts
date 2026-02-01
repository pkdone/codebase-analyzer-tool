import { createCategoryHandler } from "./handler-factory";
import { isPotentialMicroservicesArray } from "../category-data-type-guards";

/**
 * Handler for potential microservices category data.
 * Uses the factory pattern with the PotentialMicroservicesArray type guard.
 */
export const potentialMicroservicesHandler = createCategoryHandler(
  "potentialMicroservices",
  isPotentialMicroservicesArray,
);
