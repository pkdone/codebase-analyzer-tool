import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../repositories/source/sources.model";
import { logWarningMsg } from "../../../common/utils/logging";

/**
 * Utility functions for transforming flat dependency structures into hierarchical trees.
 */

/** Maximum recursion depth to prevent infinite loops or excessive memory usage */
const MAX_RECURSION_DEPTH = 4;

/**
 * Converts flat dependency structure to hierarchical structure.
 */
export function convertToHierarchical(
  flatClassData: ProjectedTopLevelJavaClassDependencies,
): HierarchicalTopLevelJavaClassDependencies {
  // Create a map for quick lookup of dependencies by namespace
  const dependencyMap = new Map<string, JavaClassDependency>();
  flatClassData.dependencies.forEach((dep) => {
    dependencyMap.set(dep.namespace, dep);
  });

  // Find the root node (level 0)
  const rootDependency = flatClassData.dependencies.find((dep) => dep.level === 0);
  if (!rootDependency) {
    // If no root found, return empty structure
    return {
      namespace: flatClassData.namespace,
      dependencies: [],
    };
  }

  // Build hierarchical structure starting from root's references
  const hierarchicalDependencies = buildHierarchicalDependencies(
    rootDependency.references,
    dependencyMap,
    new Set([flatClassData.namespace]), // Start visited set with root to avoid self cycles while allowing shared children across branches
    1, // Start at level 1 for direct dependencies
  );

  return {
    namespace: flatClassData.namespace,
    dependencies: hierarchicalDependencies,
  };
}

/**
 * Recursively builds hierarchical dependencies from references.
 */
function buildHierarchicalDependencies(
  references: readonly string[],
  dependencyMap: Map<string, JavaClassDependency>,
  visited: Set<string>,
  currentLevel: number,
): HierarchicalJavaClassDependency[] {
  if (currentLevel >= MAX_RECURSION_DEPTH) {
    logWarningMsg(
      `Maximum recursion depth of ${MAX_RECURSION_DEPTH} reached in buildHierarchicalDependencies. Stopping further recursion to prevent stack overflow.`,
    );
    return [];
  }

  const hierarchicalDeps: HierarchicalJavaClassDependency[] = [];

  for (const refNamespace of references) {
    // Skip if already visited to avoid circular dependencies
    if (visited.has(refNamespace)) {
      continue;
    }

    // Add to visited set (shared across all references at this level)
    visited.add(refNamespace);

    const dependency = dependencyMap.get(refNamespace);

    if (dependency && dependency.references.length > 0) {
      // Has child dependencies - recursively build them
      const childDependencies = buildHierarchicalDependencies(
        dependency.references,
        dependencyMap,
        new Set(visited), // Use a copy of the visited set so siblings can include the same shared descendants
        currentLevel + 1,
      );

      if (childDependencies.length > 0) {
        hierarchicalDeps.push({
          namespace: refNamespace,
          originalLevel: dependency.level,
          dependencies: childDependencies,
        });
      } else {
        // No actual child dependencies found
        hierarchicalDeps.push({
          namespace: refNamespace,
          originalLevel: dependency.level,
        });
      }
    } else {
      // Leaf node - no child dependencies
      hierarchicalDeps.push({
        namespace: refNamespace,
        originalLevel: dependency?.level,
      });
    }
  }

  return hierarchicalDeps;
}
