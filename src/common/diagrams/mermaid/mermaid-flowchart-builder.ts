/**
 * Type-safe Mermaid flowchart builder with fluent API.
 *
 * This builder encapsulates Mermaid syntax generation while providing compile-time
 * safety for node shapes, edge types, and subgraph nesting. It eliminates manual
 * string building and reduces the risk of syntax errors.
 *
 * Styles and initialization directives are injectable to allow customization
 * without coupling to specific application configurations.
 *
 * @example
 * ```typescript
 * const builder = new MermaidFlowchartBuilder({
 *   direction: "TB",
 *   initDirective: "%%{init: {'flowchart': {'diagramPadding': 30}}}%%",
 *   styleDefinitions: "classDef service fill:#fff,stroke:#00684A",
 * });
 *
 * builder
 *   .addNode("svc1", "User Service", "stadium")
 *   .addNode("svc2", "Auth Service", "stadium")
 *   .addEdge("svc1", "svc2", "authenticates")
 *   .applyStyle("svc1", "service");
 *
 * const mermaidDefinition = builder.render();
 * ```
 */

import {
  AbstractGraphBuilder,
  type NodeShape,
  type EdgeType,
  type MermaidNode,
  type MermaidEdge,
  type StyleApplication,
} from "./abstract-graph-builder";
import {
  renderFlowchart,
  type FlowchartDirection,
  type RenderableSubgraph,
  type SubgraphStyleApplication,
} from "./flowchart-renderer";

// Re-export types for convenience
export type { FlowchartDirection } from "./flowchart-renderer";
export type { NodeShape, EdgeType };

/**
 * Configuration options for MermaidFlowchartBuilder.
 */
export interface FlowchartBuilderOptions {
  /**
   * The flowchart direction (TB, BT, LR, RL).
   * @default "TB"
   */
  direction?: FlowchartDirection;

  /**
   * The Mermaid init directive string (e.g., "%%{init: {...}}%%").
   * If not provided, no init directive will be added.
   */
  initDirective?: string;

  /**
   * The style definitions to include in the flowchart.
   * This should be Mermaid classDef statements.
   * If not provided, no style definitions will be added.
   */
  styleDefinitions?: string;
}

/**
 * Internal representation of a subgraph.
 */
interface MermaidSubgraph {
  readonly id: string;
  readonly label: string;
  readonly direction?: FlowchartDirection;
  readonly nodes: MermaidNode[];
  readonly edges: MermaidEdge[];
  readonly styles: StyleApplication[];
}

/**
 * Type-safe Mermaid flowchart builder.
 *
 * Provides a fluent API for constructing Mermaid flowchart diagrams with
 * compile-time safety for node shapes, edge types, and subgraph nesting.
 */
export class MermaidFlowchartBuilder extends AbstractGraphBuilder {
  private readonly direction: FlowchartDirection;
  private readonly initDirective?: string;
  private readonly styleDefinitions?: string;
  private readonly subgraphs: MermaidSubgraph[] = [];
  private readonly subgraphStyles: SubgraphStyleApplication[] = [];

  /**
   * Creates a new MermaidFlowchartBuilder.
   *
   * @param options - Configuration options for the builder
   */
  constructor(options: FlowchartBuilderOptions = {}) {
    super();
    this.direction = options.direction ?? "TB";
    this.initDirective = options.initDirective;
    this.styleDefinitions = options.styleDefinitions;
  }

  /**
   * Adds a subgraph containing nodes and edges.
   *
   * @param id - Unique identifier for the subgraph
   * @param label - Display label for the subgraph (use " " for invisible label)
   * @param builder - Callback that receives a sub-builder for the subgraph content
   * @param direction - Optional direction override for the subgraph
   * @returns this for chaining
   */
  addSubgraph(
    id: string,
    label: string,
    builder: (subBuilder: SubgraphBuilder) => void,
    direction?: FlowchartDirection,
  ): this {
    const subBuilder = new SubgraphBuilder();
    builder(subBuilder);

    this.subgraphs.push({
      id,
      label,
      direction,
      nodes: subBuilder.getNodes(),
      edges: subBuilder.getEdges(),
      styles: subBuilder.getStyles(),
    });
    return this;
  }

  /**
   * Applies a style class to a node.
   *
   * @param nodeId - The ID of the node to style
   * @param className - The style class name to apply
   * @returns this for chaining
   */
  override applyStyle(nodeId: string, className: string): this {
    super.applyStyle(nodeId, className);
    return this;
  }

  /**
   * Applies a custom style string to a subgraph.
   * Used for making subgraphs invisible or applying custom styling.
   *
   * @param subgraphId - The ID of the subgraph to style
   * @param styleString - The Mermaid style string (e.g., "fill:transparent,stroke:transparent")
   * @returns this for chaining
   */
  styleSubgraph(subgraphId: string, styleString: string): this {
    this.subgraphStyles.push({ subgraphId, styleString });
    return this;
  }

  /**
   * Renders the flowchart to a Mermaid definition string.
   * Delegates to the pure renderer function for syntax generation.
   *
   * @returns The complete Mermaid flowchart definition
   */
  render(): string {
    // Convert internal subgraphs to renderable format
    const renderableSubgraphs: RenderableSubgraph[] = this.subgraphs.map((sg) => ({
      id: sg.id,
      label: sg.label,
      direction: sg.direction,
      nodes: sg.nodes,
      edges: sg.edges,
      styles: sg.styles,
    }));

    return renderFlowchart({
      direction: this.direction,
      initDirective: this.initDirective,
      styleDefinitions: this.styleDefinitions,
      nodes: this.getNodes(),
      edges: this.getEdges(),
      styles: this.getStyles(),
      subgraphs: renderableSubgraphs,
      subgraphStyles: this.subgraphStyles,
    });
  }
}

/**
 * Builder for subgraph content.
 * Provides a subset of the main builder's methods for use within subgraphs.
 */
export class SubgraphBuilder extends AbstractGraphBuilder {
  /** @internal */
  override getNodes(): MermaidNode[] {
    // Access protected nodes array from base class
    return [...super.getNodes()];
  }

  /** @internal */
  override getEdges(): MermaidEdge[] {
    // Access protected edges array from base class
    return [...super.getEdges()];
  }

  /** @internal */
  override getStyles(): StyleApplication[] {
    // Access protected styles array from base class
    return [...super.getStyles()];
  }
}
