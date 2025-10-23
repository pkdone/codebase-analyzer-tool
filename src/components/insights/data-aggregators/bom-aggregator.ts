import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../../tokens";

interface AggregatedDependency {
  name: string;
  groupId?: string;
  versions: Set<string>;
  scopes: Set<string>;
  locations: string[];
}

/**
 * Aggregates dependencies from all build files into a unified Bill of Materials.
 * Detects version conflicts and provides comprehensive dependency analysis.
 */
@injectable()
export class BomAggregator {
  constructor(
    @inject(TOKENS.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates all dependencies from build files for a project
   */
  async aggregateBillOfMaterials(projectName: string): Promise<{
    dependencies: {
      name: string;
      groupId?: string;
      versions: string[];
      hasConflict: boolean;
      scopes?: string[];
      locations: string[];
    }[];
    totalDependencies: number;
    conflictCount: number;
    buildFiles: string[];
  }> {
    // Fetch all build files with dependencies
    const buildFiles = await this.sourcesRepository.getProjectSourcesSummaries(projectName, [
      "maven",
      "gradle",
      "ant",
      "npm",
      "dotnet-proj",
      "nuget",
      "ruby-bundler",
      "python-pip",
      "python-setup",
      "python-poetry",
    ]);

    const dependencyMap = new Map<string, AggregatedDependency>();
    const buildFilePaths: string[] = [];

    // Aggregate dependencies from all build files
    for (const file of buildFiles) {
      if (!file.summary?.dependencies || file.summary.dependencies.length === 0) {
        continue;
      }

      buildFilePaths.push(file.filepath);

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
    const dependencies = Array.from(dependencyMap.values()).map((dep) => ({
      name: dep.name,
      groupId: dep.groupId,
      versions: Array.from(dep.versions).sort(),
      hasConflict: dep.versions.size > 1,
      scopes: Array.from(dep.scopes).sort(),
      locations: dep.locations,
    }));

    // Sort by conflict status (conflicts first), then by name
    dependencies.sort((a, b) => {
      if (a.hasConflict !== b.hasConflict) {
        return a.hasConflict ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const conflictCount = dependencies.filter((d) => d.hasConflict).length;

    return {
      dependencies,
      totalDependencies: dependencies.length,
      conflictCount,
      buildFiles: buildFilePaths,
    };
  }

  /**
   * Creates a unique key for a dependency (handles cases with/without groupId)
   */
  private createDependencyKey(name: string, groupId?: string): string {
    return groupId ? `${groupId}:${name}` : name;
  }
}
