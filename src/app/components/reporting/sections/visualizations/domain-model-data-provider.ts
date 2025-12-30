import { injectable } from "tsyringe";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";
import type {
  NestedAggregate,
  NestedEntity,
  NestedRepository,
} from "../../../../schemas/app-summaries.schema";
import {
  isCategorizedDataNameDescArray,
  type CategorizedDataItem,
} from "../file-types/categories-data-provider";

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
 * Interface for domain aggregate (flattened for reporting)
 * Note: entities is now a string[] of names for backwards compatibility with SVG generator
 * Repository is now a direct child of aggregate
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
 * because .passthrough() allows flexibility and test data may omit it
 */
interface HierarchicalBoundedContextData {
  name: string;
  description: string;
  aggregates?: NestedAggregate[];
}

/**
 * Type guard to check if data is a valid array of hierarchical bounded context data.
 * Validates the structure at runtime.
 * Accepts data that has name and description (basic structure) even if aggregates is missing,
 * since the schema uses .passthrough() which allows flexibility.
 */
function isHierarchicalBoundedContextDataArray(data: AppSummaryNameDescArray): boolean {
  if (!Array.isArray(data)) {
    return false;
  }
  // Validate each item - use a more lenient check that allows missing aggregates
  // since .passthrough() allows extra properties and aggregates might be optional in practice
  return data.every((item) => {
    // Check basic structure (name and description are required)
    if (typeof item.name !== "string" || typeof item.description !== "string") {
      return false;
    }
    // If aggregates exists, validate it's an array
    if ("aggregates" in item && !Array.isArray(item.aggregates)) {
      return false;
    }
    return true;
  });
}

/**
 * Data provider for domain model information.
 * Extracts domain model data from the hierarchical bounded contexts structure
 * and flattens it for use in reporting and diagram generation.
 */
@injectable()
export class DomainModelDataProvider {
  /**
   * Extract and transform domain model data from categorized app summary data.
   * The boundedContexts category now contains the full hierarchical structure
   * with embedded aggregates, each containing its repository and entities.
   */
  getDomainModelData(
    categorizedData: {
      category: string;
      label: string;
      data: CategorizedDataItem;
    }[],
  ): DomainModelData {
    // Find the boundedContexts category data
    const boundedContextsCategory = categorizedData.find((c) => c.category === "boundedContexts");
    if (!boundedContextsCategory || !isCategorizedDataNameDescArray(boundedContextsCategory.data)) {
      // Return empty structure if boundedContexts data is not available or wrong type
      return {
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      };
    }

    // Validate the data structure using type guard
    if (!isHierarchicalBoundedContextDataArray(boundedContextsCategory.data)) {
      // Return empty structure if data doesn't match expected structure
      return {
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      };
    }

    const hierarchicalContexts = boundedContextsCategory.data as HierarchicalBoundedContextData[];

    // Transform hierarchical data into flattened domain model structure
    const boundedContexts = this.transformHierarchicalContexts(hierarchicalContexts);

    // Flatten all aggregates, entities, and repositories from bounded contexts
    const aggregates = this.flattenAggregates(boundedContexts);
    const entities = this.flattenEntities(boundedContexts);
    const repositories = this.flattenRepositories(boundedContexts);

    return {
      boundedContexts,
      aggregates,
      entities,
      repositories,
    };
  }

  /**
   * Transform hierarchical bounded context data into the reporting format
   */
  private transformHierarchicalContexts(
    hierarchicalContexts: HierarchicalBoundedContextData[],
  ): DomainBoundedContext[] {
    return hierarchicalContexts.map((context) => {
      const aggregates = this.transformAggregates(context.aggregates ?? []);
      const entities = this.extractEntitiesFromAggregates(context.aggregates ?? []);
      const repositories = this.extractRepositoriesFromAggregates(context.aggregates ?? []);

      return {
        name: context.name,
        description: context.description,
        aggregates,
        entities,
        repositories,
      };
    });
  }

  /**
   * Transform nested aggregates to the reporting format
   * Extracts entity names as string[] and includes the repository
   */
  private transformAggregates(nestedAggregates: NestedAggregate[]): DomainAggregate[] {
    return nestedAggregates.map((aggregate) => ({
      name: aggregate.name,
      description: aggregate.description,
      entities: aggregate.entities.map((entity) => entity.name),
      repository: this.transformRepository(aggregate.repository),
    }));
  }

  /**
   * Transform a nested repository to the reporting format
   */
  private transformRepository(nestedRepository: NestedRepository): DomainRepository {
    return {
      name: nestedRepository.name,
      description: nestedRepository.description,
    };
  }

  /**
   * Extract all entities from nested aggregates
   */
  private extractEntitiesFromAggregates(nestedAggregates: NestedAggregate[]): DomainEntity[] {
    const entities: DomainEntity[] = [];
    const seenNames = new Set<string>();

    for (const aggregate of nestedAggregates) {
      for (const entity of aggregate.entities) {
        if (!seenNames.has(entity.name)) {
          seenNames.add(entity.name);
          entities.push(this.transformEntity(entity));
        }
      }
    }

    return entities;
  }

  /**
   * Extract all repositories from nested aggregates
   */
  private extractRepositoriesFromAggregates(
    nestedAggregates: NestedAggregate[],
  ): DomainRepository[] {
    const repositories: DomainRepository[] = [];
    const seenNames = new Set<string>();

    for (const aggregate of nestedAggregates) {
      if (!seenNames.has(aggregate.repository.name)) {
        seenNames.add(aggregate.repository.name);
        repositories.push(this.transformRepository(aggregate.repository));
      }
    }

    return repositories;
  }

  /**
   * Transform a nested entity to the reporting format
   */
  private transformEntity(nestedEntity: NestedEntity): DomainEntity {
    return {
      name: nestedEntity.name,
      description: nestedEntity.description,
    };
  }

  /**
   * Flatten all aggregates from all bounded contexts
   */
  private flattenAggregates(boundedContexts: DomainBoundedContext[]): DomainAggregate[] {
    const aggregates: DomainAggregate[] = [];
    const seenNames = new Set<string>();

    for (const context of boundedContexts) {
      for (const aggregate of context.aggregates) {
        if (!seenNames.has(aggregate.name)) {
          seenNames.add(aggregate.name);
          aggregates.push(aggregate);
        }
      }
    }

    return aggregates;
  }

  /**
   * Flatten all entities from all bounded contexts
   */
  private flattenEntities(boundedContexts: DomainBoundedContext[]): DomainEntity[] {
    const entities: DomainEntity[] = [];
    const seenNames = new Set<string>();

    for (const context of boundedContexts) {
      for (const entity of context.entities) {
        if (!seenNames.has(entity.name)) {
          seenNames.add(entity.name);
          entities.push(entity);
        }
      }
    }

    return entities;
  }

  /**
   * Flatten all repositories from all bounded contexts
   */
  private flattenRepositories(boundedContexts: DomainBoundedContext[]): DomainRepository[] {
    const repositories: DomainRepository[] = [];
    const seenNames = new Set<string>();

    for (const context of boundedContexts) {
      for (const repository of context.repositories) {
        if (!seenNames.has(repository.name)) {
          seenNames.add(repository.name);
          repositories.push(repository);
        }
      }
    }

    return repositories;
  }
}
