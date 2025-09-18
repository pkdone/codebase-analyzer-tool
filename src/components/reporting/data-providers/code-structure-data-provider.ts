import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../repositories/source/sources.model";
import { TOKENS } from "../../../di/tokens";

/**
 * Data provider responsible for aggregating code structure information for reports.
 * Handles class dependencies, architectural patterns, and code organization.
 */
@injectable()
export class CodeStructureDataProvider {
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of top-level Java classes with hierarchical dependency structure.
   */
  async getTopLevelJavaClasses(
    projectName: string,
  ): Promise<HierarchicalTopLevelJavaClassDependencies[]> {
    const flatData: ProjectedTopLevelJavaClassDependencies[] =
      await this.sourcesRepository.getProjectTopLevelJavaClasses(projectName);
    return flatData.map(
      (
        classData: ProjectedTopLevelJavaClassDependencies,
      ): HierarchicalTopLevelJavaClassDependencies => this.convertToHierarchical(classData),
    );
  }

  /**
   * Converts flat dependency structure to hierarchical structure.
   */
  private convertToHierarchical(
    flatClassData: ProjectedTopLevelJavaClassDependencies,
  ): HierarchicalTopLevelJavaClassDependencies {
    // Create a map for quick lookup of dependencies by classpath
    const dependencyMap = new Map<string, JavaClassDependency>();
    flatClassData.dependencies.forEach((dep) => {
      dependencyMap.set(dep.classpath, dep);
    });

    // Find the root node (level 0)
    const rootDependency = flatClassData.dependencies.find((dep) => dep.level === 0);
    if (!rootDependency) {
      // If no root found, return empty structure
      return {
        classpath: flatClassData.classpath,
        dependencies: [],
      };
    }

    // Build hierarchical structure starting from root's references
    const hierarchicalDependencies = this.buildHierarchicalDependencies(
      rootDependency.references,
      dependencyMap,
      new Set(), // Track visited nodes to avoid infinite recursion
      1, // Start at level 1 for direct dependencies
    );

    return {
      classpath: flatClassData.classpath,
      dependencies: hierarchicalDependencies,
    };
  }

  /**
   * Recursively builds hierarchical dependencies from references.
   */
  private buildHierarchicalDependencies(
    references: readonly string[],
    dependencyMap: Map<string, JavaClassDependency>,
    visited: Set<string>,
    currentLevel: number,
  ): HierarchicalJavaClassDependency[] {
    const hierarchicalDeps: HierarchicalJavaClassDependency[] = [];

    for (const refClasspath of references) {
      // Skip if already visited to avoid circular dependencies
      if (visited.has(refClasspath)) {
        continue;
      }

      // Add to visited set
      const newVisited = new Set(visited);
      newVisited.add(refClasspath);

      const dependency = dependencyMap.get(refClasspath);

      if (dependency && dependency.references.length > 0) {
        // Has child dependencies - recursively build them
        const childDependencies = this.buildHierarchicalDependencies(
          dependency.references,
          dependencyMap,
          newVisited,
          currentLevel + 1,
        );

        if (childDependencies.length > 0) {
          hierarchicalDeps.push({
            classpath: refClasspath,
            originalLevel: dependency.level,
            dependencies: childDependencies,
          });
        } else {
          // No actual child dependencies found
          hierarchicalDeps.push({
            classpath: refClasspath,
            originalLevel: dependency.level,
          });
        }
      } else {
        // Leaf node - no child dependencies
        hierarchicalDeps.push({
          classpath: refClasspath,
          originalLevel: dependency?.level,
        });
      }
    }

    return hierarchicalDeps;
  }
}
