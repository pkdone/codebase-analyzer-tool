import { inject, injectable } from "tsyringe";
import path from "path";
import { writeFile } from "../../../../../common/fs/file-operations";
import { reportingTokens } from "../../../../di/tokens";
import { MermaidRenderer } from "../mermaid/mermaid-renderer";
import { escapeMermaidLabel } from "../mermaid/mermaid-definition-builders";
import { buildStyleDefinitions, applyStyle } from "../mermaid/mermaid-styles.config";
import type { HierarchicalJavaClassDependency } from "../../../../repositories/sources/sources.model";
import { logOneLineWarning } from "../../../../../common/utils/logging";

/**
 * Maximum depth for dependency tree traversal in Mermaid diagrams.
 * Prevents excessive diagram complexity and rendering issues.
 */
const MAX_MERMAID_DEPTH = 10;

/**
 * Maximum number of nodes to include in a single Mermaid diagram.
 * Prevents rendering timeout issues with large dependency trees.
 */
const MAX_NODES_PER_DIAGRAM = 100;

/**
 * Generates SVG images showing dependency trees for Java classes using Mermaid.
 * Creates visual representations of class hierarchies and their dependency relationships.
 */
@injectable()
export class DependencyTreeSvgGenerator {
  constructor(
    @inject(reportingTokens.MermaidRenderer)
    private readonly mermaidRenderer: MermaidRenderer,
  ) {}

  /**
   * Generate an SVG file showing the hierarchical dependency tree for a specific Java class
   * @returns The filename of the generated SVG (without path)
   */
  async generateHierarchicalDependencyTreeSvg(
    classpath: string,
    hierarchicalDependencies: readonly HierarchicalJavaClassDependency[],
    outputDir: string,
  ): Promise<string> {
    try {
      // Create a safe filename from the classpath
      const filename = this.createSafeFilename(classpath);
      const filepath = path.join(outputDir, `${filename}.svg`);

      // Count total nodes to determine if we need to limit depth
      const totalNodes = this.countTotalNodes(hierarchicalDependencies);
      const effectiveMaxDepth =
        totalNodes > MAX_NODES_PER_DIAGRAM ? Math.min(MAX_MERMAID_DEPTH, 5) : MAX_MERMAID_DEPTH;

      // Build mermaid definition
      const mermaidDefinition = this.buildDependencyTreeDefinition(
        classpath,
        hierarchicalDependencies,
        effectiveMaxDepth,
      );

      // Calculate dynamic dimensions based on content
      const nodeCount = Math.min(totalNodes, MAX_NODES_PER_DIAGRAM);
      const dynamicWidth = Math.max(1200, nodeCount * 50);
      const dynamicHeight = Math.max(800, nodeCount * 30);

      // Render to SVG using mermaid-cli
      const svgContent = await this.mermaidRenderer.renderToSvg(mermaidDefinition, {
        width: Math.min(dynamicWidth, 4000),
        height: Math.min(dynamicHeight, 4000),
        backgroundColor: "white",
      });

      // Write the SVG file
      await writeFile(filepath, svgContent);

      return filename + ".svg";
    } catch (error: unknown) {
      logOneLineWarning(
        `Failed to generate dependency tree SVG for ${classpath}: ${String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Create a filesystem-safe filename from a Java classpath
   */
  private createSafeFilename(classpath: string): string {
    return classpath.replace(/[^a-zA-Z0-9.]/g, ".").replace(/\.+/g, ".");
  }

  /**
   * Build the Mermaid flowchart definition for a dependency tree
   */
  private buildDependencyTreeDefinition(
    rootClasspath: string,
    dependencies: readonly HierarchicalJavaClassDependency[],
    maxDepth: number,
  ): string {
    const lines: string[] = ["graph TD"];

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Track generated nodes to avoid duplicates
    const generatedNodes = new Set<string>();
    let nodeCounter = 0;
    const nodeIdMap = new Map<string, string>();

    // Helper to get or create a node ID for a classpath
    const getNodeId = (classpath: string): string => {
      const existingId = nodeIdMap.get(classpath);
      if (existingId !== undefined) {
        return existingId;
      }
      const newId = `node_${nodeCounter++}`;
      nodeIdMap.set(classpath, newId);
      return newId;
    };

    // Create root node
    const rootNodeId = getNodeId(rootClasspath);
    const rootLabel = this.formatClassLabel(rootClasspath);
    lines.push(`    ${rootNodeId}["${escapeMermaidLabel(rootLabel)}"]`);
    lines.push(applyStyle(rootNodeId, "rootDependency"));
    generatedNodes.add(rootClasspath);

    // Track connections to avoid duplicates
    const connections = new Set<string>();

    // Recursively build nodes and connections
    this.buildDependencyNodes(
      dependencies,
      rootNodeId,
      lines,
      generatedNodes,
      connections,
      getNodeId,
      1,
      maxDepth,
    );

    return lines.join("\n");
  }

  /**
   * Recursively build dependency nodes and connections
   */
  private buildDependencyNodes(
    dependencies: readonly HierarchicalJavaClassDependency[],
    parentNodeId: string,
    lines: string[],
    generatedNodes: Set<string>,
    connections: Set<string>,
    getNodeId: (classpath: string) => string,
    currentDepth: number,
    maxDepth: number,
  ): void {
    if (currentDepth > maxDepth) {
      return;
    }

    // Limit the number of children at each level to prevent overly wide diagrams
    const maxChildrenPerNode = 10;
    const limitedDependencies = dependencies.slice(0, maxChildrenPerNode);

    for (const dep of limitedDependencies) {
      // Stop if we've reached the node limit
      if (generatedNodes.size >= MAX_NODES_PER_DIAGRAM) {
        return;
      }

      const nodeId = getNodeId(dep.namespace);
      const connectionKey = `${parentNodeId}->${nodeId}`;

      // Add node if not already generated
      if (!generatedNodes.has(dep.namespace)) {
        const label = this.formatClassLabel(dep.namespace);
        lines.push(`    ${nodeId}["${escapeMermaidLabel(label)}"]`);
        lines.push(applyStyle(nodeId, "dependency"));
        generatedNodes.add(dep.namespace);
      }

      // Add connection if not already added
      if (!connections.has(connectionKey)) {
        lines.push(`    ${parentNodeId} --> ${nodeId}`);
        connections.add(connectionKey);
      }

      // Recursively process children
      if (dep.dependencies && dep.dependencies.length > 0) {
        this.buildDependencyNodes(
          dep.dependencies,
          nodeId,
          lines,
          generatedNodes,
          connections,
          getNodeId,
          currentDepth + 1,
          maxDepth,
        );
      }
    }
  }

  /**
   * Format a classpath into a readable label.
   * Shows the last 2 parts of the classpath to keep labels manageable.
   */
  private formatClassLabel(classpath: string): string {
    const parts = classpath.split(".");
    if (parts.length <= 2) {
      return classpath;
    }
    // Show last 2 parts for brevity
    return "..." + parts.slice(-2).join(".");
  }

  /**
   * Count total number of nodes in hierarchical dependency tree
   */
  private countTotalNodes(dependencies: readonly HierarchicalJavaClassDependency[]): number {
    let count = dependencies.length;

    for (const dep of dependencies) {
      if (dep.dependencies && dep.dependencies.length > 0) {
        count += this.countTotalNodes(dep.dependencies);
      }
    }

    return count;
  }
}
