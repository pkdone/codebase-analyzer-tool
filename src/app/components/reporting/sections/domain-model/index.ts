/**
 * Domain model section - visualization of bounded contexts, aggregates, entities, and repositories.
 */

export { DomainModelSection } from "./domain-model-section";
export { DomainModelTransformer } from "./domain-model-transformer";

// Domain model types
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";
