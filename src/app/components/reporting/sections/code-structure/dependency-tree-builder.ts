import { Graph } from "graphlib";
import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../../repositories/sources/sources.model";
import { logOneLineWarning } from "../../../../../common/utils/logging";

/**
 * Maximum depth for dependency tree traversal to prevent excessive depth in pathological cases.
 */
const MAX_TRAVERSAL_DEPTH = 50;

/**
 * Utility functions for transforming flat dependency structures into hierarchical trees.
 */

/**
 * Converts flat dependency structure to hierarchical structure.
 */
export function convertToHierarchical(
  flatClassData: ProjectedTopLevelJavaClassDependencies,
): HierarchicalTopLevelJavaClassDependencies {
  // Create a map for quick lookup of dependencies by namespace
  const dependencyMap = new Map<string, JavaClassDependency>();
  for (const dep of flatClassData.dependencies) {
    dependencyMap.set(dep.namespace, dep);
  }

  // Find the root node (level 0)
  const rootDependency = flatClassData.dependencies.find((dep) => dep.level === 0);
  if (!rootDependency) {
    // If no root found, return empty structure
    return {
      namespace: flatClassData.namespace,
      dependencies: [],
    };
  }

  // Build a directed graph from the flat dependencies
  const graph = buildDependencyGraph(dependencyMap);

  // Build hierarchical structure starting from root's references using DFS
  const hierarchicalDependencies = buildHierarchicalDependencies(
    rootDependency.references,
    graph,
    dependencyMap,
    new Set([flatClassData.namespace]), // Start visited set with root to avoid self cycles
  );

  return {
    namespace: flatClassData.namespace,
    dependencies: hierarchicalDependencies,
  };
}

/**
 * Builds a directed graph from the dependency map using graphlib.
 */
function buildDependencyGraph(dependencyMap: Map<string, JavaClassDependency>): Graph {
  const graph = new Graph({ directed: true });

  for (const [namespace, dep] of dependencyMap) {
    graph.setNode(namespace, dep);
    for (const ref of dep.references) {
      graph.setEdge(namespace, ref);
    }
  }

  return graph;
}

/**
 * Builds hierarchical dependencies from references using DFS traversal with path-based cycle detection.
 * Shared nodes can appear under multiple branches (diamond pattern is allowed),
 * but cycles within a single path are avoided.
 */
function buildHierarchicalDependencies(
  references: readonly string[],
  graph: Graph,
  dependencyMap: Map<string, JavaClassDependency>,
  rootVisited: Set<string>,
): HierarchicalJavaClassDependency[] {
  /**
   * Recursively builds a hierarchical node for the given namespace.
   * @param namespace - The namespace to build a node for
   * @param pathVisited - Set of namespaces already visited in the current path (for cycle detection)
   * @param depth - Current depth in the traversal
   * @returns The hierarchical node, or null if this would create a cycle
   */
  function buildNode(
    namespace: string,
    pathVisited: Set<string>,
    depth: number,
  ): HierarchicalJavaClassDependency | null {
    // Cycle detection: skip if already in the current path
    if (pathVisited.has(namespace)) {
      return null;
    }

    // Depth limit to prevent excessive depth
    if (depth >= MAX_TRAVERSAL_DEPTH) {
      logOneLineWarning(
        `Maximum depth of ${MAX_TRAVERSAL_DEPTH} reached for ${namespace}. Not processing children.`,
      );
      const dep = dependencyMap.get(namespace);
      return {
        namespace,
        originalLevel: dep?.level,
      };
    }

    // Get dependency info for original level
    const dep = dependencyMap.get(namespace);

    // Get children from graph (successors)
    // Note: graphlib's successors() returns undefined for non-existent nodes,
    // but @types/graphlib incorrectly types it as `void | string[]` instead of `undefined | string[]`
    const children = (graph.successors(namespace) as string[] | undefined) ?? [];

    // Add current node to path for child traversal
    const newPathVisited = new Set(pathVisited);
    newPathVisited.add(namespace);

    // Build child nodes recursively
    const childNodes: HierarchicalJavaClassDependency[] = [];
    for (const child of children) {
      const childNode = buildNode(child, newPathVisited, depth + 1);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    // Return node with dependencies only if there are children
    if (childNodes.length > 0) {
      return {
        namespace,
        originalLevel: dep?.level,
        dependencies: childNodes,
      };
    }

    return {
      namespace,
      originalLevel: dep?.level,
    };
  }

  // Build hierarchical nodes for each root reference
  const result: HierarchicalJavaClassDependency[] = [];
  for (const refNamespace of references) {
    // Skip references already visited (e.g., root itself)
    if (rootVisited.has(refNamespace)) {
      continue;
    }

    const node = buildNode(refNamespace, rootVisited, 1);
    if (node) {
      result.push(node);
    }
  }

  return result;
}
