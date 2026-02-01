/**
 * Domain model section - visualization of bounded contexts, aggregates, entities, and repositories.
 */

export { DomainModelSection } from "./domain-model-section";
export { DomainModelTransformer } from "./domain-model-transformer";
export { DomainModelDiagramGenerator } from "./domain-model-diagram-generator";
export type { DomainDiagramOptions } from "./domain-model-diagram-generator";

// Domain model types
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";
