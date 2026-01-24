import type { HierarchicalBoundedContext } from "../../../../schemas/app-summaries.schema";

/**
 * Domain model types for reporting and visualization.
 * These interfaces define the flattened data structures used for
 * generating domain model diagrams and reports.
 */

/**
 * Interface for domain entity (flattened for reporting)
 */
export interface DomainEntity {
  name: string;
  description: string;
}

/**
 * Interface for domain repository (flattened for reporting)
 */
export interface DomainRepository {
  name: string;
  description: string;
}

/**
 * Interface for domain aggregate (flattened for reporting).
 * Entities are represented as a string array of names.
 * Repository is a direct child of aggregate.
 */
export interface DomainAggregate {
  name: string;
  description: string;
  entities: string[];
  repository: DomainRepository;
}

/**
 * Interface for domain bounded context (for reporting)
 */
export interface DomainBoundedContext {
  name: string;
  description: string;
  aggregates: DomainAggregate[];
  entities: DomainEntity[];
  repositories: DomainRepository[];
}

/**
 * Interface for the complete domain model data structure
 */
export interface DomainModelData {
  boundedContexts: DomainBoundedContext[];
  aggregates: DomainAggregate[];
  entities: DomainEntity[];
  repositories: DomainRepository[];
}

/**
 * Type alias for hierarchical bounded context data from the Zod schema.
 * Uses the inferred type from hierarchicalBoundedContextSchema.
 * The aggregates property is required by the schema; defensive coding handles
 * legacy data that may predate the current schema structure.
 */
export type HierarchicalBoundedContextData = HierarchicalBoundedContext;
