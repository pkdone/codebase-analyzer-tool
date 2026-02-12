import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens, configTokens } from "../../../../di/tokens";
import type { FileProcessingRulesType } from "../../../../config/file-handling";
import type { BomDependency } from "./dependencies.types";

interface AggregatedDependency {
  name: string;
  groupId?: string;
  versions: Set<string>;
  scopes: Set<string>;
  locations: string[];
}

/**
 * Type for the BOM aggregation result
 */
export interface BomAggregationResult {
  dependencies: BomDependency[];
  totalDependencies: number;
  conflictCount: number;
  buildFiles: string[];
}

/**
 * Data provider responsible for aggregating Bill of Materials from build files.
 * Detects version conflicts and provides comprehensive dependency analysis.
 */
@injectable()
export class BomDataProvider {
  /**
   * Constructor with dependency injection.
   * @param sourcesRepository - Repository for retrieving source file data
   * @param fileProcessingConfig - Configuration for file processing rules
   */
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(configTokens.FileProcessingRules)
    private readonly fileProcessingConfig: FileProcessingRulesType,
  ) {}

  /**
   * Aggregates all dependencies from build files for a project
   */
  async getBillOfMaterials(projectName: string): Promise<BomAggregationResult> {
    // Fetch all build files with dependencies
    const buildFiles = await this.sourcesRepository.getProjectSourcesSummariesByCanonicalType(
      projectName,
      [...this.fileProcessingConfig.BOM_DEPENDENCY_CANONICAL_TYPES],
    );

    const dependencyMap = new Map<string, AggregatedDependency>();
    const buildFilePaths = new Set<string>();

    // Aggregate dependencies from all build files
    for (const file of buildFiles) {
      if (!file.summary?.dependencies || file.summary.dependencies.length === 0) {
        continue;
      }

      buildFilePaths.add(file.filepath);

      for (const dep of file.summary.dependencies) {
        const key = this.createDependencyKey(dep.name, dep.groupId);

        let aggregated = dependencyMap.get(key);

        if (!aggregated) {
          aggregated = {
            name: dep.name,
            groupId: dep.groupId,
            versions: new Set(),
            scopes: new Set(),
            locations: [],
          };
          dependencyMap.set(key, aggregated);
        }

        if (dep.version) {
          aggregated.versions.add(dep.version);
        }

        if (dep.scope) {
          aggregated.scopes.add(dep.scope);
        }

        if (!aggregated.locations.includes(file.filepath)) {
          aggregated.locations.push(file.filepath);
        }
      }
    }

    // Convert to array and detect conflicts
    const dependencies = Array.from(dependencyMap.values(), (dep) => ({
      name: dep.name,
      groupId: dep.groupId,
      versions: Array.from(dep.versions).toSorted(),
      hasConflict: dep.versions.size > 1,
      scopes: Array.from(dep.scopes).toSorted(),
      locations: dep.locations,
    }));

    // Sort by conflict status (conflicts first), then by name
    const sortedDependencies = dependencies.toSorted((a, b) => {
      if (a.hasConflict !== b.hasConflict) {
        return a.hasConflict ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    const conflictCount = sortedDependencies.filter((d) => d.hasConflict).length;

    return {
      dependencies: sortedDependencies,
      totalDependencies: sortedDependencies.length,
      conflictCount,
      buildFiles: Array.from(buildFilePaths),
    };
  }

  /**
   * Creates a unique key for a dependency (handles cases with/without groupId)
   */
  private createDependencyKey(name: string, groupId?: string): string {
    return groupId ? `${groupId}:${name}` : name;
  }
}
