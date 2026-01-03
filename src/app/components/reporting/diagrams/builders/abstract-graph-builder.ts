/**
 * Supported node shapes in Mermaid flowcharts.
 */
export type NodeShape = "rectangle" | "rounded" | "stadium" | "hexagon" | "circle" | "rhombus";

/**
 * Supported edge types in Mermaid flowcharts.
 */
export type EdgeType = "solid" | "dotted" | "dashed" | "invisible";

/**
 * Configuration for creating a node.
 */
export interface NodeConfig {
  readonly id: string;
  readonly label: string;
  readonly shape?: NodeShape;
}

/**
 * Configuration for creating an edge.
 */
export interface EdgeConfig {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type?: EdgeType;
}

/**
 * Internal representation of a node.
 */
export interface MermaidNode {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
}

/**
 * Internal representation of an edge.
 */
export interface MermaidEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type: EdgeType;
}

/**
 * Internal representation of a style application.
 */
export interface StyleApplication {
  readonly nodeId: string;
  readonly className: string;
}

/**
 * Abstract base class for graph builders that share common node, edge, and style management.
 * This eliminates duplication between MermaidFlowchartBuilder and SubgraphBuilder.
 */
export abstract class AbstractGraphBuilder {
  protected readonly nodes: MermaidNode[] = [];
  protected readonly edges: MermaidEdge[] = [];
  protected readonly styles: StyleApplication[] = [];

  /**
   * Adds a node to the graph.
   *
   * @param id - Unique identifier for the node
   * @param label - Display label for the node
   * @param shape - Node shape (defaults to "rectangle")
   * @returns this for chaining
   */
  addNode(id: string, label: string, shape: NodeShape = "rectangle"): this {
    this.nodes.push({ id, label, shape });
    return this;
  }

  /**
   * Adds multiple nodes to the graph.
   *
   * @param nodes - Array of node configurations
   * @returns this for chaining
   */
  addNodes(nodes: readonly NodeConfig[]): this {
    for (const node of nodes) {
      this.addNode(node.id, node.label, node.shape ?? "rectangle");
    }
    return this;
  }

  /**
   * Adds an edge between two nodes.
   *
   * @param from - Source node ID
   * @param to - Target node ID
   * @param label - Optional edge label
   * @param type - Edge type (defaults to "solid")
   * @returns this for chaining
   */
  addEdge(from: string, to: string, label?: string, type: EdgeType = "solid"): this {
    this.edges.push({ from, to, label, type });
    return this;
  }

  /**
   * Adds multiple edges to the graph.
   *
   * @param edges - Array of edge configurations
   * @returns this for chaining
   */
  addEdges(edges: readonly EdgeConfig[]): this {
    for (const edge of edges) {
      this.addEdge(edge.from, edge.to, edge.label, edge.type ?? "solid");
    }
    return this;
  }

  /**
   * Applies a style class to a node.
   *
   * @param nodeId - The ID of the node to style
   * @param className - The style class name to apply
   * @returns this for chaining
   */
  applyStyle(nodeId: string, className: string): this {
    this.styles.push({ nodeId, className });
    return this;
  }

  /**
   * Gets all nodes in the graph.
   * @internal
   */
  protected getNodes(): readonly MermaidNode[] {
    return [...this.nodes];
  }

  /**
   * Gets all edges in the graph.
   * @internal
   */
  protected getEdges(): readonly MermaidEdge[] {
    return [...this.edges];
  }

  /**
   * Gets all style applications in the graph.
   * @internal
   */
  protected getStyles(): readonly StyleApplication[] {
    return [...this.styles];
  }
}
