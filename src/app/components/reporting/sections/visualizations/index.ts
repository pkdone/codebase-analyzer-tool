/**
 * Visualization sections - domain models, microservices architecture, and current architecture.
 */

export { DomainModelSection } from "./domain-model-section";
export { MicroservicesArchitectureSection } from "./microservices-architecture-section";
export { CurrentArchitectureSection } from "./current-architecture-section";
export { DomainModelDataProvider } from "./domain-model-data-provider";

// Domain model types
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";
