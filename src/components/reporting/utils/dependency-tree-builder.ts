import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
  HierarchicalJavaClassDependency,
  JavaClassDependency,
} from "../../../repositories/sources/sources.model";
import { logOneLineWarning } from "../../../common/utils/logging";

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
 * Iteratively builds hierarchical dependencies from references using a fully iterative approach.
 * Uses two passes: discovery phase to find all nodes, then assembly phase using reverse
 * topological order (leaf nodes first) to build the tree without recursion.
 */
function buildHierarchicalDependencies(
  references: readonly string[],
  dependencyMap: Map<string, JavaClassDependency>,
  visited: Set<string>,
  currentLevel: number,
): HierarchicalJavaClassDependency[] {
  interface DiscoveryWorkItem {
    namespace: string;
    level: number;
    visitedSet: Set<string>;
  }

  // Track nodes and their parent-child relationships
  interface NodeInfo {
    namespace: string;
    originalLevel: number | undefined;
    children: string[];
  }

  const allNodes = new Map<string, NodeInfo>();
  const discoveryStack: DiscoveryWorkItem[] = [];

  // Initialize stack with root references
  for (const refNamespace of references) {
    if (visited.has(refNamespace)) {
      continue;
    }

    const visitedSet = new Set(visited);
    visitedSet.add(refNamespace);

    discoveryStack.push({
      namespace: refNamespace,
      level: currentLevel,
      visitedSet,
    });
  }

  // === PHASE 1: Discovery - populate allNodes with all nodes and their children ===
  const ITERATIVE_MAX_DEPTH = 50;

  while (discoveryStack.length > 0) {
    const workItem = discoveryStack.pop();
    if (!workItem) continue;

    const dependency = dependencyMap.get(workItem.namespace);

    // Create node info for this namespace if not already exists
    let nodeInfo = allNodes.get(workItem.namespace);
    if (!nodeInfo) {
      nodeInfo = {
        namespace: workItem.namespace,
        originalLevel: dependency?.level,
        children: [],
      };
      allNodes.set(workItem.namespace, nodeInfo);
    }

    // Apply depth limit to prevent infinite loops
    if (workItem.level >= ITERATIVE_MAX_DEPTH) {
      logOneLineWarning(
        `Maximum depth of ${ITERATIVE_MAX_DEPTH} reached in buildHierarchicalDependencies for ${workItem.namespace}. Not processing children to prevent excessive depth.`,
      );
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
        if (!allNodes.has(refNamespace)) {
          const childDependency = dependencyMap.get(refNamespace);
          allNodes.set(refNamespace, {
            namespace: refNamespace,
            originalLevel: childDependency?.level,
            children: [],
          });
        }

        const childVisitedSet = new Set(workItem.visitedSet);
        childVisitedSet.add(refNamespace);

        discoveryStack.push({
          namespace: refNamespace,
          level: workItem.level + 1,
          visitedSet: childVisitedSet,
        });
      }
    }
  }

  // === PHASE 2: Assembly - build tree iteratively using reverse topological order ===
  // Process leaf nodes first (nodes with no unprocessed children), then their parents

  const processedNodes = new Map<string, HierarchicalJavaClassDependency>();

  // Track how many unprocessed children each node has
  const pendingChildCount = new Map<string, number>();
  for (const [namespace, nodeInfo] of allNodes) {
    pendingChildCount.set(namespace, nodeInfo.children.length);
  }

  // Build reverse adjacency: for each node, which nodes have it as a child?
  const parents = new Map<string, string[]>();
  for (const [namespace, nodeInfo] of allNodes) {
    for (const child of nodeInfo.children) {
      const childParents = parents.get(child) ?? [];
      childParents.push(namespace);
      parents.set(child, childParents);
    }
  }

  // Start with leaf nodes (nodes with no children)
  const readyToProcess: string[] = [];
  for (const [namespace, count] of pendingChildCount) {
    if (count === 0) {
      readyToProcess.push(namespace);
    }
  }

  // Process nodes in reverse topological order
  while (readyToProcess.length > 0) {
    const namespace = readyToProcess.pop();
    if (namespace === undefined) continue;
    const nodeInfo = allNodes.get(namespace);
    if (!nodeInfo) continue;

    // Build the node - all children are already processed
    const childNodes: HierarchicalJavaClassDependency[] = [];
    for (const childNamespace of nodeInfo.children) {
      const childNode = processedNodes.get(childNamespace);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    // Create final node with proper readonly properties
    const result: HierarchicalJavaClassDependency =
      childNodes.length > 0
        ? {
            namespace: nodeInfo.namespace,
            originalLevel: nodeInfo.originalLevel,
            dependencies: childNodes,
          }
        : {
            namespace: nodeInfo.namespace,
            originalLevel: nodeInfo.originalLevel,
          };

    processedNodes.set(namespace, result);

    // Decrement pending count for all parents and add ready ones to queue
    const nodeParents = parents.get(namespace) ?? [];
    for (const parent of nodeParents) {
      const currentCount = pendingChildCount.get(parent) ?? 0;
      const newCount = currentCount - 1;
      pendingChildCount.set(parent, newCount);
      if (newCount === 0) {
        readyToProcess.push(parent);
      }
    }
  }

  // Build root-level nodes from processed results
  const hierarchicalDeps: HierarchicalJavaClassDependency[] = [];
  for (const refNamespace of references) {
    if (visited.has(refNamespace)) continue;
    const node = processedNodes.get(refNamespace);
    if (node) {
      hierarchicalDeps.push(node);
    }
  }

  return hierarchicalDeps;
}
