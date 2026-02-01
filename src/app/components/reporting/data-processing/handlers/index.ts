/**
 * Category data handlers for the CategorizedSectionDataBuilder.
 *
 * Each handler encapsulates the logic for processing a specific category type,
 * following the Open/Closed Principle - new categories can be added by creating
 * new handlers without modifying the builder.
 *
 * Most handlers use the createCategoryHandler factory for consistent, DRY implementation.
 * The inferredArchitectureHandler has custom transform logic and is implemented separately.
 */

export type { CategoryDataHandler, ProcessableCategory } from "./category-handler.interface";
export { createCategoryHandler } from "./handler-factory";

export { technologiesHandler } from "./technologies-handler";
export { businessProcessesHandler } from "./business-processes-handler";
export { boundedContextsHandler } from "./bounded-contexts-handler";
export { potentialMicroservicesHandler } from "./potential-microservices-handler";
export { inferredArchitectureHandler } from "./inferred-architecture-handler";
