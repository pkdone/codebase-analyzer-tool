import { injectable } from "tsyringe";
import type {
  NestedAggregate,
  NestedEntity,
  NestedRepository,
} from "../../../../schemas/app-summaries.schema";
import {
  isCategorizedDataNameDescArray,
  type CategorizedDataItem,
} from "../shared/categorized-section-data-builder";
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
   * The boundedContexts category contains the full hierarchical structure
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

    // Validate the data structure using type guard - narrows type to HierarchicalBoundedContextData[]
    if (!isHierarchicalBoundedContextDataArray(boundedContextsCategory.data)) {
      // Return empty structure if data doesn't match expected structure
      return {
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      };
    }

    // Type is now narrowed to HierarchicalBoundedContextData[] by the type guard above
    const hierarchicalContexts = boundedContextsCategory.data;

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
      // The Zod schema requires aggregates, but the type guard allows missing aggregates
      // for flexibility with runtime data (legacy data, passthrough properties).
      // Use property check to safely handle the runtime edge case where aggregates might be missing.
      const contextAggregates =
        "aggregates" in context && Array.isArray(context.aggregates) ? context.aggregates : [];
      const aggregates = this.transformAggregates(contextAggregates);
      const entities = this.extractEntitiesFromAggregates(contextAggregates);
      const repositories = this.extractRepositoriesFromAggregates(contextAggregates);

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
   * Generic helper to flatten domain items from bounded contexts.
   * Deduplicates items by name and extracts them using the provided extractor function.
   *
   * @param contexts - Array of bounded contexts to flatten from
   * @param extractor - Function to extract the specific item array from each context
   * @returns Deduplicated array of domain items
   */
  private flattenDomainItems<T extends { name: string }>(
    contexts: DomainBoundedContext[],
    extractor: (ctx: DomainBoundedContext) => T[],
  ): T[] {
    const items: T[] = [];
    const seenNames = new Set<string>();

    for (const context of contexts) {
      for (const item of extractor(context)) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Flatten all aggregates from all bounded contexts
   */
  private flattenAggregates(boundedContexts: DomainBoundedContext[]): DomainAggregate[] {
    return this.flattenDomainItems(boundedContexts, (ctx) => ctx.aggregates);
  }

  /**
   * Flatten all entities from all bounded contexts
   */
  private flattenEntities(boundedContexts: DomainBoundedContext[]): DomainEntity[] {
    return this.flattenDomainItems(boundedContexts, (ctx) => ctx.entities);
  }

  /**
   * Flatten all repositories from all bounded contexts
   */
  private flattenRepositories(boundedContexts: DomainBoundedContext[]): DomainRepository[] {
    return this.flattenDomainItems(boundedContexts, (ctx) => ctx.repositories);
  }
}
