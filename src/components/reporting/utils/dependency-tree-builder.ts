import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../repositories/sources/sources.model";
import { logWarningMsg } from "../../../common/utils/logging";

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
 * Iteratively builds hierarchical dependencies from references using a stack-based approach.
 * This eliminates the risk of stack overflow with deep dependency trees.
 */
function buildHierarchicalDependencies(
  references: readonly string[],
  dependencyMap: Map<string, JavaClassDependency>,
  visited: Set<string>,
  currentLevel: number,
): HierarchicalJavaClassDependency[] {
  interface WorkItem {
    namespace: string;
    level: number;
    visitedSet: Set<string>;
    parentNamespaces: readonly string[]; // Track path to this node for proper hierarchy
  }

  // Track nodes and their parent-child relationships
  interface NodeInfo {
    node: HierarchicalJavaClassDependency;
    children: string[];
  }

  const allNodes = new Map<string, NodeInfo>();
  const stack: WorkItem[] = [];

  // Initialize stack with root references
  for (const refNamespace of references) {
    if (visited.has(refNamespace)) {
      continue;
    }

    const visitedSet = new Set(visited);
    visitedSet.add(refNamespace);

    stack.push({
      namespace: refNamespace,
      level: currentLevel,
      visitedSet,
      parentNamespaces: [], // Root level has no parents
    });
  }

  // First pass: populate allNodes with all nodes we encounter, and track their references
  while (stack.length > 0) {
    const workItem = stack.pop();
    if (!workItem) continue;

    const dependency = dependencyMap.get(workItem.namespace);

    // Create node info for this namespace if not already exists
    let nodeInfo = allNodes.get(workItem.namespace);
    if (!nodeInfo) {
      nodeInfo = {
        node: {
          namespace: workItem.namespace,
          originalLevel: dependency?.level,
        },
        children: [],
      };
      allNodes.set(workItem.namespace, nodeInfo);
    }

    // Note: With iterative approach, depth is much less of a concern than with recursion
    // We still apply a reasonable limit to prevent infinite loops
    const ITERATIVE_MAX_DEPTH = 50; // Much higher than recursive limit
    if (workItem.level >= ITERATIVE_MAX_DEPTH) {
      logWarningMsg(
        `Maximum depth of ${ITERATIVE_MAX_DEPTH} reached in buildHierarchicalDependencies for ${workItem.namespace}. Not processing children to prevent excessive depth.`,
      );
      // Still create the node but with no children
      continue;
    }

    // If this node has children, add them to the stack and track them
    if (dependency && dependency.references.length > 0) {
      for (const refNamespace of dependency.references) {
        if (workItem.visitedSet.has(refNamespace)) {
          continue;
        }

        // Add to children list
        if (!nodeInfo.children.includes(refNamespace)) {
          nodeInfo.children.push(refNamespace);
        }

        // Create node info for child if not already exists
        let childNodeInfo = allNodes.get(refNamespace);
        if (!childNodeInfo) {
          const childDependency = dependencyMap.get(refNamespace);
          childNodeInfo = {
            node: {
              namespace: refNamespace,
              originalLevel: childDependency?.level,
            },
            children: [],
          };
          allNodes.set(refNamespace, childNodeInfo);
        }

        const childVisitedSet = new Set(workItem.visitedSet);
        childVisitedSet.add(refNamespace);

        stack.push({
          namespace: refNamespace,
          level: workItem.level + 1,
          visitedSet: childVisitedSet,
          parentNamespaces: [...workItem.parentNamespaces, workItem.namespace],
        });
      }
    }
  }

  // Build the final hierarchical structure iteratively using a stack
  const processedNodes = new Map<string, HierarchicalJavaClassDependency>();

  // Helper function to build a node and its children recursively
  function buildNode(namespace: string): HierarchicalJavaClassDependency | null {
    const nodeInfo = allNodes.get(namespace);
    if (!nodeInfo) {
      console.error(`[DEBUG] No nodeInfo for ${namespace}`);
      console.error(`[DEBUG] All nodes:`, Array.from(allNodes.keys()));
      return null;
    }

    // Check if already processed
    const existing = processedNodes.get(namespace);
    if (existing) {
      return existing;
    }

    // Build child nodes recursively
    const childNodes: HierarchicalJavaClassDependency[] = [];
    for (const childNamespace of nodeInfo.children) {
      const childNode = buildNode(childNamespace);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    // Create final node with proper readonly properties
    const result: HierarchicalJavaClassDependency =
      childNodes.length > 0
        ? {
            namespace: nodeInfo.node.namespace,
            originalLevel: nodeInfo.node.originalLevel,
            dependencies: childNodes,
          }
        : {
            namespace: nodeInfo.node.namespace,
            originalLevel: nodeInfo.node.originalLevel,
          };

    processedNodes.set(namespace, result);
    return result;
  }

  // Build root-level nodes
  const hierarchicalDeps: HierarchicalJavaClassDependency[] = [];
  for (const refNamespace of references) {
    if (visited.has(refNamespace)) continue;
    const node = buildNode(refNamespace);
    if (node) {
      hierarchicalDeps.push(node);
    }
  }

  return hierarchicalDeps;
}
