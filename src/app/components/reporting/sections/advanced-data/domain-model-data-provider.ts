import { injectable } from "tsyringe";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";

// Extended interface for aggregate data with additional properties
type AggregateData = AppSummaryNameDescArray[0] & {
  entities?: string[];
  repository?: string;
};

// Extended interface for bounded context data with explicit aggregate names
type BoundedContextData = AppSummaryNameDescArray[0] & {
  aggregates?: string[];
};

export interface DomainEntity {
  name: string;
  description: string;
}

export interface DomainAggregate {
  name: string;
  description: string;
  entities: string[];
  repository?: string;
}

export interface DomainBoundedContext {
  name: string;
  description: string;
  aggregates: DomainAggregate[];
  entities: DomainEntity[];
  repositories: DomainEntity[];
}

export interface DomainModelData {
  boundedContexts: DomainBoundedContext[];
  aggregates: DomainAggregate[];
  entities: DomainEntity[];
  repositories: DomainEntity[];
}

/**
 * Data provider for domain model information.
 * Groups bounded contexts with their associated aggregates, entities, and repositories.
 */
@injectable()
export class DomainModelDataProvider {
  /**
   * Extract and group domain model data from categorized app summary data
   */
  getDomainModelData(
    categorizedData: {
      category: string;
      label: string;
      data: AppSummaryNameDescArray;
    }[],
  ): DomainModelData {
    // Extract individual category data
    const boundedContextsData = this.findCategoryData(categorizedData, "boundedContexts");
    const aggregatesData = this.findCategoryData(categorizedData, "aggregates");
    const entitiesData = this.findCategoryData(categorizedData, "entities");
    const repositoriesData = this.findCategoryData(categorizedData, "repositories");

    // Map data to domain model types
    const aggregates = this.mapToAggregates(aggregatesData);
    const entities = this.mapToEntities(entitiesData);

    // Use repositories from separate category if available, otherwise extract from aggregates
    const repositories =
      repositoriesData.length > 0
        ? this.mapToRepositories(repositoriesData)
        : this.extractRepositoriesFromAggregates(aggregates);

    // Group aggregates, entities, and repositories by bounded context
    const boundedContexts = this.groupByBoundedContext(
      boundedContextsData,
      aggregates,
      entities,
      repositories,
    );

    return {
      boundedContexts,
      aggregates,
      entities,
      repositories,
    };
  }

  /**
   * Find category data by category name
   */
  private findCategoryData(
    categorizedData: {
      category: string;
      label: string;
      data: AppSummaryNameDescArray;
    }[],
    categoryName: string,
  ): AppSummaryNameDescArray {
    const category = categorizedData.find((c) => c.category === categoryName);
    return category?.data ?? [];
  }

  /**
   * Map aggregates data to DomainAggregate objects
   */
  private mapToAggregates(aggregatesData: AppSummaryNameDescArray): DomainAggregate[] {
    return aggregatesData.map((item) => {
      const aggregateItem = item as AggregateData;
      const entities = aggregateItem.entities ?? [];
      const repository = aggregateItem.repository ?? "";

      return {
        name: item.name,
        description: item.description,
        entities,
        repository,
      };
    });
  }

  /**
   * Map repositories data to DomainEntity objects
   */
  private mapToRepositories(repositoriesData: AppSummaryNameDescArray): DomainEntity[] {
    return repositoriesData.map((item) => ({
      name: item.name,
      description: item.description,
    }));
  }

  /**
   * Extract repositories from aggregates
   */
  private extractRepositoriesFromAggregates(aggregates: DomainAggregate[]): DomainEntity[] {
    const repositoryMap = new Map<string, DomainEntity>();

    aggregates.forEach((aggregate) => {
      if (aggregate.repository?.trim()) {
        repositoryMap.set(aggregate.repository, {
          name: aggregate.repository,
          description: `Repository for ${aggregate.name}`,
        });
      }
    });

    return Array.from(repositoryMap.values());
  }

  /**
   * Map entities data to DomainEntity objects
   */
  private mapToEntities(entitiesData: AppSummaryNameDescArray): DomainEntity[] {
    return entitiesData.map((item) => ({
      name: item.name,
      description: item.description,
    }));
  }

  /**
   * Group aggregates, entities, and repositories by bounded context using explicit relationships.
   * Uses the aggregates array from each bounded context to determine which aggregates belong to it,
   * then derives entities from those aggregates.
   */
  private groupByBoundedContext(
    boundedContextsData: AppSummaryNameDescArray,
    aggregates: DomainAggregate[],
    entities: DomainEntity[],
    repositories: DomainEntity[],
  ): DomainBoundedContext[] {
    return boundedContextsData.map((context) => {
      const bcData = context as BoundedContextData;
      const aggregateNames = bcData.aggregates ?? [];

      // Match aggregates by name from the explicit list
      const contextAggregates = aggregates.filter((agg) => aggregateNames.includes(agg.name));

      // Get entities from matched aggregates
      const contextEntityNames = new Set(contextAggregates.flatMap((agg) => agg.entities));
      const contextEntities = entities.filter((e) => contextEntityNames.has(e.name));

      // Get repositories from matched aggregates
      const contextRepositories = this.getRepositoriesForAggregates(
        contextAggregates,
        repositories,
      );

      return {
        name: context.name,
        description: context.description,
        aggregates: contextAggregates,
        entities: contextEntities,
        repositories: contextRepositories,
      };
    });
  }

  /**
   * Get repositories for aggregates in a context
   */
  private getRepositoriesForAggregates(
    aggregates: DomainAggregate[],
    allRepositories: DomainEntity[],
  ): DomainEntity[] {
    const repositoryNames = aggregates
      .map((aggregate) => aggregate.repository)
      .filter((repo) => repo?.trim());

    return allRepositories.filter((repository) => repositoryNames.includes(repository.name));
  }
}
