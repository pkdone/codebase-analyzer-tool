/**
 * Visualization sections - domain models, microservices architecture, and current architecture.
 */

export { DomainModelSection } from "./domain-model-section";
export { MicroservicesArchitectureSection } from "./microservices-architecture-section";
export { CurrentArchitectureSection } from "./current-architecture-section";
export { DomainModelDataProvider } from "./domain-model-data-provider";

// Re-export data extractors for backwards compatibility
// Note: Prefer importing directly from "../../data-processing" for new code
export {
  extractMicroservicesData,
  extractInferredArchitectureData,
  extractKeyBusinessActivities,
  extractMicroserviceFields,
  isInferredArchitectureCategoryData,
} from "../../data-processing";

// Domain model types
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";
