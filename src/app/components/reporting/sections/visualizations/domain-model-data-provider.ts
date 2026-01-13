import { injectable } from "tsyringe";
import type {
  HierarchicalBoundedContext,
  NestedAggregate,
  NestedEntity,
  NestedRepository,
} from "../../../../schemas/app-summaries.schema";
import {
  type CategorizedSectionItem,
  type BoundedContextsArray,
} from "../overview/categorized-section-data-builder";
import type {
  DomainEntity,
  DomainRepository,
  DomainAggregate,
  DomainBoundedContext,
  DomainModelData,
} from "./domain-model.types";

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
   *
   * Uses the discriminated union to automatically narrow the data type.
   */
  getDomainModelData(categorizedData: CategorizedSectionItem[]): DomainModelData {
    // Find the boundedContexts category - type is automatically narrowed via discriminator
    const boundedContextsCategory = categorizedData.find(
      (item): item is Extract<CategorizedSectionItem, { category: "boundedContexts" }> =>
        item.category === "boundedContexts",
    );

    if (!boundedContextsCategory || boundedContextsCategory.data.length === 0) {
      // Return empty structure if boundedContexts data is not available
      return {
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      };
    }

    // Data is now typed as BoundedContextsArray (hierarchical bounded context structure)
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
   * Transform hierarchical bounded context data into the reporting format.
   * Accepts BoundedContextsArray from the discriminated union.
   */
  private transformHierarchicalContexts(
    hierarchicalContexts: BoundedContextsArray,
  ): DomainBoundedContext[] {
    return hierarchicalContexts.map((context: HierarchicalBoundedContext) => {
      // aggregates is required by schema but may be missing in runtime data (passthrough)
      // Using Array.isArray check to handle edge cases with legacy data
      const contextAggregates = Array.isArray(context.aggregates) ? context.aggregates : [];
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
