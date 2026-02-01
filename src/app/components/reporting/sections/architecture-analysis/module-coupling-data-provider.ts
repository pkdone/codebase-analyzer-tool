import { injectable, inject } from "tsyringe";
import path from "path";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { ModuleCoupling } from "./architecture-analysis.types";
import { moduleCouplingConfig } from "../../config/module-coupling.config";
import { calculateCouplingLevel } from "../../domain/coupling-calculator";
import { getCouplingLevelPresentation } from "../../presentation";

type ModuleCouplingMap = Record<string, Record<string, number>>;

/**
 * Data provider responsible for aggregating internal references between modules to build a coupling matrix.
 * Analyzes module dependencies to identify highly coupled and loosely coupled components.
 */
@injectable()
export class ModuleCouplingDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates module coupling relationships for a project
   */
  async getModuleCoupling(
    projectName: string,
    moduleDepth: number = moduleCouplingConfig.DEFAULT_MODULE_DEPTH,
  ): Promise<ModuleCoupling> {
    // Fetch all source files from the project
    const sourceFiles = await this.sourcesRepository.getProjectSourcesSummariesByFileType(
      projectName,
      [],
    );

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
        const toModule = this.extractModuleNameFromReference(reference, file.filepath, moduleDepth);
        if (!toModule || toModule === fromModule) {
          // Skip self-references
          continue;
        }

        uniqueModules.add(toModule);

        // Initialize coupling map structure and increment reference count
        couplingMap[fromModule] ??= {};
        couplingMap[fromModule][toModule] ??= 0;
        couplingMap[fromModule][toModule]++;
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
    const sortedCouplings = couplings.toSorted((a, b) => {
      if (a.referenceCount !== b.referenceCount) {
        return b.referenceCount - a.referenceCount;
      }
      if (a.fromModule !== b.fromModule) {
        return a.fromModule.localeCompare(b.fromModule);
      }
      return a.toModule.localeCompare(b.toModule);
    });

    // Add pre-computed coupling levels for each coupling entry
    // Business logic (calculateCouplingLevel) determines the level,
    // then presentation helper maps it to display values
    const couplingsWithLevels = sortedCouplings.map((coupling) => {
      const couplingLevel = calculateCouplingLevel(coupling.referenceCount, highestCouplingCount);
      const { level, cssClass } = getCouplingLevelPresentation(couplingLevel);
      return {
        ...coupling,
        couplingLevel: level,
        couplingLevelClass: cssClass,
      };
    });

    return {
      couplings: couplingsWithLevels,
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
  private extractModuleNameFromReference(
    reference: string,
    sourceFilepath: string,
    depth: number,
  ): string | null {
    // If reference looks like a file path (contains / or \), treat it as a path
    if (reference.includes("/") || reference.includes("\\")) {
      // Resolve relative paths against the source file's directory
      if (reference.startsWith(".")) {
        const sourceDir = path.dirname(sourceFilepath);
        // Use path.join to resolve the relative path within the project structure
        // This handles ../ and ./ correctly relative to the source file
        const resolvedPath = path.join(sourceDir, reference);
        return this.extractModuleName(resolvedPath, depth);
      }
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
