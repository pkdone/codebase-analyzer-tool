import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../repositories/source/sources.model";

/**
 * Utility functions for transforming flat dependency structures into hierarchical trees.
 */

/**
 * Converts flat dependency structure to hierarchical structure.
 */
export function convertToHierarchical(
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
  const hierarchicalDependencies = buildHierarchicalDependencies(
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
export function buildHierarchicalDependencies(
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
      const childDependencies = buildHierarchicalDependencies(
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
