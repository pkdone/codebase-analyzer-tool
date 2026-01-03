/**
 * Type-safe Mermaid flowchart builder with fluent API.
 *
 * This builder encapsulates Mermaid syntax generation while providing compile-time
 * safety for node shapes, edge types, and subgraph nesting. It eliminates manual
 * string building and reduces the risk of syntax errors.
 *
 * @example
 * ```typescript
 * const builder = new MermaidFlowchartBuilder("TB")
 *   .addNode("svc1", "User Service", "stadium")
 *   .addNode("svc2", "Auth Service", "stadium")
 *   .addEdge("svc1", "svc2", "authenticates")
 *   .applyStyle("svc1", "service");
 *
 * const mermaidDefinition = builder.render();
 * ```
 */

import {
  escapeMermaidLabel,
  buildMermaidInitDirective,
  buildArchitectureInitDirective,
} from "../utils/mermaid-builders";
import { buildStyleDefinitions, applyStyle as applyStyleClass } from "../utils/mermaid-styles";
import {
  AbstractGraphBuilder,
  type NodeShape,
  type EdgeType,
  type NodeConfig,
  type EdgeConfig,
  type MermaidNode,
  type MermaidEdge,
  type StyleApplication,
} from "./abstract-graph-builder";

/**
 * Supported flowchart directions.
 */
export type FlowchartDirection = "TB" | "BT" | "LR" | "RL";

/**
 * Type of initialization directive to use for the diagram.
 */
export type InitDirectiveType = "standard" | "architecture";

// Re-export types for backwards compatibility
export type { NodeShape, EdgeType, NodeConfig, EdgeConfig };

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
 * Maps node shapes to their Mermaid syntax wrappers.
 */
const SHAPE_SYNTAX: Readonly<Record<NodeShape, { open: string; close: string }>> = {
  rectangle: { open: "[", close: "]" },
  rounded: { open: "(", close: ")" },
  stadium: { open: "([", close: "])" },
  hexagon: { open: "{{", close: "}}" },
  circle: { open: "((", close: "))" },
  rhombus: { open: "{", close: "}" },
};

/**
 * Maps edge types to their Mermaid syntax.
 */
const EDGE_SYNTAX: Readonly<Record<EdgeType, string>> = {
  solid: "-->",
  dotted: "-.->",
  dashed: "-.-",
  invisible: "~~~",
};

/**
 * Type-safe Mermaid flowchart builder.
 *
 * Provides a fluent API for constructing Mermaid flowchart diagrams with
 * compile-time safety for node shapes, edge types, and subgraph nesting.
 */
export class MermaidFlowchartBuilder extends AbstractGraphBuilder {
  private readonly direction: FlowchartDirection;
  private readonly initDirectiveType: InitDirectiveType;
  private readonly subgraphs: MermaidSubgraph[] = [];
  private readonly subgraphStyles: { subgraphId: string; styleString: string }[] = [];

  /**
   * Creates a new MermaidFlowchartBuilder.
   *
   * @param direction - The flowchart direction (TB, BT, LR, RL)
   * @param initDirectiveType - The type of init directive to use
   */
  constructor(
    direction: FlowchartDirection = "TB",
    initDirectiveType: InitDirectiveType = "standard",
  ) {
    super();
    this.direction = direction;
    this.initDirectiveType = initDirectiveType;
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
   * Applies styles to multiple nodes.
   *
   * @param styles - Array of style applications
   * @returns this for chaining
   */
  applyStyles(styles: readonly { nodeId: string; className: string }[]): this {
    for (const style of styles) {
      this.applyStyle(style.nodeId, style.className);
    }
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
   *
   * @returns The complete Mermaid flowchart definition
   */
  render(): string {
    const lines: string[] = [];

    // Add init directive
    const initDirective =
      this.initDirectiveType === "architecture"
        ? buildArchitectureInitDirective()
        : buildMermaidInitDirective();
    lines.push(initDirective);

    // Add flowchart declaration
    lines.push(`flowchart ${this.direction}`);

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Add top-level nodes
    for (const node of this.getNodes()) {
      lines.push(this.renderNode(node, "    "));
    }

    // Add top-level edges
    for (const edge of this.getEdges()) {
      lines.push(this.renderEdge(edge, "    "));
    }

    // Add subgraphs
    for (const subgraph of this.subgraphs) {
      lines.push(...this.renderSubgraph(subgraph));
    }

    // Add top-level styles
    for (const style of this.getStyles()) {
      lines.push(applyStyleClass(style.nodeId, style.className));
    }

    // Add subgraph styles
    for (const subgraphStyle of this.subgraphStyles) {
      lines.push(`    style ${subgraphStyle.subgraphId} ${subgraphStyle.styleString}`);
    }

    return lines.join("\n");
  }

  /**
   * Renders a single node to Mermaid syntax.
   */
  private renderNode(node: MermaidNode, indent: string): string {
    const syntax = SHAPE_SYNTAX[node.shape];
    const escapedLabel = escapeMermaidLabel(node.label);
    return `${indent}${node.id}${syntax.open}"${escapedLabel}"${syntax.close}`;
  }

  /**
   * Renders a single edge to Mermaid syntax.
   */
  private renderEdge(edge: MermaidEdge, indent: string): string {
    const edgeSyntax = EDGE_SYNTAX[edge.type];
    if (edge.label) {
      const escapedLabel = escapeMermaidLabel(edge.label);
      return `${indent}${edge.from} ${edgeSyntax}|"${escapedLabel}"| ${edge.to}`;
    }
    return `${indent}${edge.from} ${edgeSyntax} ${edge.to}`;
  }

  /**
   * Renders a subgraph to Mermaid syntax lines.
   */
  private renderSubgraph(subgraph: MermaidSubgraph): string[] {
    const lines: string[] = [];

    // Subgraph opening
    lines.push(`    subgraph ${subgraph.id}["${subgraph.label}"]`);

    // Direction override if specified
    if (subgraph.direction) {
      lines.push(`        direction ${subgraph.direction}`);
    }

    // Nodes within subgraph
    for (const node of subgraph.nodes) {
      lines.push(this.renderNode(node, "        "));
    }

    // Edges within subgraph
    for (const edge of subgraph.edges) {
      lines.push(this.renderEdge(edge, "        "));
    }

    // Close subgraph
    lines.push("    end");

    // Styles for nodes in subgraph (applied outside the subgraph block)
    for (const style of subgraph.styles) {
      lines.push(applyStyleClass(style.nodeId, style.className));
    }

    return lines;
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
