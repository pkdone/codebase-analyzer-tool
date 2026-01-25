/**
 * Visualization sections - domain models, microservices architecture, and current architecture.
 */

export { DomainModelSection } from "./domain-model-section";
export { MicroservicesArchitectureSection } from "./microservices-architecture-section";
export { CurrentArchitectureSection } from "./current-architecture-section";
export { DomainModelTransformer } from "./domain-model-transformer";

// Domain model types
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";

// Data extractors for visualization components
export { extractMicroservicesData } from "./microservices-data-extractor";
export { extractInferredArchitectureData } from "./architecture-data-extractor";
