import { injectable } from "tsyringe";
import type {
  NestedAggregate,
  NestedEntity,
  NestedRepository,
} from "../../../../schemas/app-summaries.schema";
import {
  isCategorizedDataNameDescArray,
  type CategorizedDataItem,
} from "../file-types/categories-data-provider";
import type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
  HierarchicalBoundedContextData,
} from "./domain-model.types";
import { isHierarchicalBoundedContextDataArray } from "./domain-model.guards";

// Re-export types for consumers
export type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";

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
