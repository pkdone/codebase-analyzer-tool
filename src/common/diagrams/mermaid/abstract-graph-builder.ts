/**
 * Node shapes in Mermaid flowcharts.
 *
 * Common shapes are provided as type literals for autocomplete, but any valid
 * Mermaid shape string is accepted. This allows forward compatibility with
 * new Mermaid shapes without requiring changes to this library.
 *
 * Common shapes:
 * - "rectangle" - Standard rectangular node `[text]`
 * - "rounded" - Rounded corners `(text)`
 * - "stadium" - Stadium/pill shape `([text])`
 * - "hexagon" - Hexagonal shape `{{text}}`
 * - "circle" - Circular shape `((text))`
 * - "rhombus" - Diamond shape `{text}`
 */
export type NodeShape =
  | (string & {})
  | "rectangle"
  | "rounded"
  | "stadium"
  | "hexagon"
  | "circle"
  | "rhombus";

/**
 * Edge types in Mermaid flowcharts.
 *
 * Common types are provided as type literals for autocomplete, but any valid
 * Mermaid edge type string is accepted for forward compatibility.
 *
 * Common types:
 * - "solid" - Solid arrow `-->`
 * - "dotted" - Dotted arrow `-.->`
 * - "dashed" - Dashed line `-.-`
 * - "invisible" - Invisible connection `~~~`
 */
export type EdgeType = (string & {}) | "solid" | "dotted" | "dashed" | "invisible";

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
 * Error thrown when graph validation fails.
 */
export class GraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphValidationError";
  }
}

/**
 * Abstract base class for graph builders that share common node, edge, and style management.
 * This eliminates duplication between MermaidFlowchartBuilder and SubgraphBuilder.
 *
 * Uses a Map for node storage to enable O(1) lookups for duplicate detection and
 * referential integrity validation.
 */
export abstract class AbstractGraphBuilder {
  protected readonly nodeMap = new Map<string, MermaidNode>();
  protected readonly edges: MermaidEdge[] = [];
  protected readonly styles: StyleApplication[] = [];
  private strictValidationEnabled = false;

  /**
   * Enables or disables strict validation mode.
   * When enabled, addEdge will throw an error if either endpoint node doesn't exist.
   *
   * @param enabled - Whether to enable strict validation
   * @returns this for chaining
   */
  setStrictValidation(enabled: boolean): this {
    this.strictValidationEnabled = enabled;
    return this;
  }

  /**
   * Returns whether strict validation is currently enabled.
   */
  isStrictValidationEnabled(): boolean {
    return this.strictValidationEnabled;
  }

  /**
   * Adds a node to the graph.
   * Throws an error if a node with the same ID already exists.
   *
   * @param id - Unique identifier for the node
   * @param label - Display label for the node
   * @param shape - Node shape (defaults to "rectangle")
   * @returns this for chaining
   * @throws GraphValidationError if a node with the same ID already exists
   */
  addNode(id: string, label: string, shape: NodeShape = "rectangle"): this {
    if (this.nodeMap.has(id)) {
      throw new GraphValidationError(`Node with id "${id}" already exists`);
    }
    this.nodeMap.set(id, { id, label, shape });
    return this;
  }

  /**
   * Adds an edge between two nodes.
   * In strict validation mode, throws an error if either node doesn't exist.
   *
   * @param from - Source node ID
   * @param to - Target node ID
   * @param label - Optional edge label
   * @param type - Edge type (defaults to "solid")
   * @returns this for chaining
   * @throws GraphValidationError in strict mode if either node doesn't exist
   */
  addEdge(from: string, to: string, label?: string, type: EdgeType = "solid"): this {
    if (this.strictValidationEnabled) {
      this.validateNodeExists(from, "from");
      this.validateNodeExists(to, "to");
    }
    this.edges.push({ from, to, label, type });
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
    return Array.from(this.nodeMap.values());
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

  /**
   * Validates node existence and throws a descriptive error if not found.
   */
  private validateNodeExists(nodeId: string, paramName: string): void {
    if (!this.nodeMap.has(nodeId)) {
      throw new GraphValidationError(
        `Edge references non-existent "${paramName}" node: "${nodeId}"`,
      );
    }
  }
}
