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
 * Interface for hierarchical bounded context data from the new schema
 * Repository is now at the aggregate level, not bounded context level
 * Note: aggregates is optional in practice even though the schema requires it,
 * because .passthrough() allows flexibility and test data may omit it.
 * The index signature allows compatibility with Zod's passthrough schema type.
 */
export interface HierarchicalBoundedContextData {
  /** Index signature for compatibility with Zod passthrough schemas */
  [key: string]: unknown;
  name: string;
  description: string;
  aggregates?: import("../../../../schemas/app-summaries.schema").NestedAggregate[];
}
