import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/repositories.tokens";

type ModuleCouplingMap = Record<string, Record<string, number>>;

/**
 * Aggregates internal references between modules to build a coupling matrix.
 * Analyzes module dependencies to identify highly coupled and loosely coupled components.
 */
@injectable()
export class ModuleCouplingAggregator {
  private readonly DEFAULT_MODULE_DEPTH = 2;

  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates module coupling relationships for a project
   */
  async aggregateModuleCoupling(
    projectName: string,
    moduleDepth: number = this.DEFAULT_MODULE_DEPTH,
  ): Promise<{
    couplings: {
      fromModule: string;
      toModule: string;
      referenceCount: number;
    }[];
    totalModules: number;
    totalCouplings: number;
    highestCouplingCount: number;
    moduleDepth: number;
  }> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummaries(projectName, []);

    const couplingMap: ModuleCouplingMap = {};
    const uniqueModules = new Set<string>();

    // Analyze each source file for internal references
    for (const file of sourceFiles) {
      if (!file.summary?.internalReferences || file.summary.internalReferences.length === 0) {
        continue;
      }

      const fromModule = this.extractModuleName(file.filepath, moduleDepth);
      if (!fromModule) {
        continue;
      }

      uniqueModules.add(fromModule);

      // Process each internal reference
      for (const reference of file.summary.internalReferences) {
        const toModule = this.extractModuleNameFromReference(reference, moduleDepth);
        if (!toModule || toModule === fromModule) {
          // Skip self-references
          continue;
        }

        uniqueModules.add(toModule);

        // Initialize coupling map structure and increment reference count
        couplingMap[fromModule] = couplingMap[fromModule] ?? {};
        couplingMap[fromModule][toModule] = (couplingMap[fromModule][toModule] ?? 0) + 1;
      }
    }

    // Convert map to array and calculate statistics
    const couplings: {
      fromModule: string;
      toModule: string;
      referenceCount: number;
    }[] = [];

    let highestCouplingCount = 0;

    for (const fromModule of Object.keys(couplingMap)) {
      for (const toModule of Object.keys(couplingMap[fromModule])) {
        const referenceCount = couplingMap[fromModule][toModule];
        couplings.push({
          fromModule,
          toModule,
          referenceCount,
        });

        if (referenceCount > highestCouplingCount) {
          highestCouplingCount = referenceCount;
        }
      }
    }

    // Sort by reference count (descending), then by module names for consistency
    couplings.sort((a, b) => {
      if (a.referenceCount !== b.referenceCount) {
        return b.referenceCount - a.referenceCount;
      }
      if (a.fromModule !== b.fromModule) {
        return a.fromModule.localeCompare(b.fromModule);
      }
      return a.toModule.localeCompare(b.toModule);
    });

    return {
      couplings,
      totalModules: uniqueModules.size,
      totalCouplings: couplings.length,
      highestCouplingCount,
      moduleDepth,
    };
  }

  /**
   * Extracts module name from a file path by taking the first N directory segments.
   * For example, with depth 2:
   * - "src/components/insights/aggregator.ts" -> "src/components"
   * - "app/services/user-service.js" -> "app/services"
   */
  private extractModuleName(filepath: string, depth: number): string | null {
    // Normalize path separators to forward slashes
    const normalizedPath = filepath.replaceAll("\\", "/");

    // Split by forward slash and filter out empty segments
    const segments = normalizedPath.split("/").filter((segment) => segment.length > 0);

    // Return null if there aren't enough segments
    if (segments.length < depth) {
      return null;
    }

    // Take the first N segments and join them
    return segments.slice(0, depth).join("/");
  }

  /**
   * Extracts module name from a reference string.
   * References can be in various formats:
   * - Package/namespace: "com.example.service.UserService" or "app/services/UserService"
   * - File path: "../../services/user-service"
   * - Class name: "UserService"
   */
  private extractModuleNameFromReference(reference: string, depth: number): string | null {
    // If reference looks like a file path (contains / or \), treat it as a path
    if (reference.includes("/") || reference.includes("\\")) {
      return this.extractModuleName(reference, depth);
    }

    // If reference looks like a Java/C# namespace (contains dots), split by dots
    if (reference.includes(".")) {
      const segments = reference.split(".");
      if (segments.length < depth) {
        return null;
      }
      return segments.slice(0, depth).join(".");
    }

    // For simple class names without namespace info, we can't determine the module
    return null;
  }
}
