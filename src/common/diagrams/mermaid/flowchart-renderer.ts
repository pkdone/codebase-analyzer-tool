/**
 * Pure functions for rendering Mermaid flowchart syntax.
 *
 * This module separates syntax generation from the builder's state management,
 * enabling easier testing and cleaner separation of concerns.
 */

import { escapeMermaidLabel, applyStyleClass } from "./mermaid-utils";
import type {
  NodeShape,
  EdgeType,
  MermaidNode,
  MermaidEdge,
  StyleApplication,
} from "./abstract-graph-builder";

/**
 * Supported flowchart directions.
 */
export type FlowchartDirection = "TB" | "BT" | "LR" | "RL";

/**
 * Internal representation of a subgraph for rendering.
 */
export interface RenderableSubgraph {
  readonly id: string;
  readonly label: string;
  readonly direction?: FlowchartDirection;
  readonly nodes: readonly MermaidNode[];
  readonly edges: readonly MermaidEdge[];
  readonly styles: readonly StyleApplication[];
}

/**
 * Style application for a subgraph container.
 */
export interface SubgraphStyleApplication {
  readonly subgraphId: string;
  readonly styleString: string;
}

/**
 * Complete flowchart data needed for rendering.
 */
export interface FlowchartRenderData {
  readonly direction: FlowchartDirection;
  readonly initDirective?: string;
  readonly styleDefinitions?: string;
  readonly nodes: readonly MermaidNode[];
  readonly edges: readonly MermaidEdge[];
  readonly styles: readonly StyleApplication[];
  readonly subgraphs: readonly RenderableSubgraph[];
  readonly subgraphStyles: readonly SubgraphStyleApplication[];
}

/**
 * Maps known node shapes to their Mermaid syntax wrappers.
 * Unknown shapes fall back to rectangle syntax.
 */
const SHAPE_SYNTAX: Readonly<Record<string, { open: string; close: string }>> = {
  rectangle: { open: "[", close: "]" },
  rounded: { open: "(", close: ")" },
  stadium: { open: "([", close: "])" },
  hexagon: { open: "{{", close: "}}" },
  circle: { open: "((", close: "))" },
  rhombus: { open: "{", close: "}" },
};

/** Default shape syntax used for unknown shapes */
const DEFAULT_SHAPE_SYNTAX = SHAPE_SYNTAX.rectangle;

/**
 * Gets the Mermaid syntax for a node shape, falling back to rectangle for unknown shapes.
 */
function getShapeSyntax(shape: NodeShape): { open: string; close: string } {
  return SHAPE_SYNTAX[shape] ?? DEFAULT_SHAPE_SYNTAX;
}

/**
 * Maps known edge types to their Mermaid syntax.
 * Unknown edge types fall back to solid arrow.
 */
const EDGE_SYNTAX: Readonly<Record<string, string>> = {
  solid: "-->",
  dotted: "-.->",
  dashed: "-.-",
  invisible: "~~~",
};

/** Default edge syntax used for unknown edge types */
const DEFAULT_EDGE_SYNTAX = EDGE_SYNTAX.solid;

/**
 * Gets the Mermaid syntax for an edge type, falling back to solid for unknown types.
 */
function getEdgeSyntax(edgeType: EdgeType): string {
  return EDGE_SYNTAX[edgeType] ?? DEFAULT_EDGE_SYNTAX;
}

/**
 * Renders a single node to Mermaid syntax.
 *
 * @param node - The node to render
 * @param indent - Indentation prefix for the line
 * @returns The Mermaid syntax string for the node
 */
function renderNode(node: MermaidNode, indent: string): string {
  const syntax = getShapeSyntax(node.shape);
  const escapedLabel = escapeMermaidLabel(node.label);
  return `${indent}${node.id}${syntax.open}"${escapedLabel}"${syntax.close}`;
}

/**
 * Renders a single edge to Mermaid syntax.
 *
 * @param edge - The edge to render
 * @param indent - Indentation prefix for the line
 * @returns The Mermaid syntax string for the edge
 */
function renderEdge(edge: MermaidEdge, indent: string): string {
  const edgeSyntax = getEdgeSyntax(edge.type);

  if (edge.label) {
    const escapedLabel = escapeMermaidLabel(edge.label);
    return `${indent}${edge.from} ${edgeSyntax}|"${escapedLabel}"| ${edge.to}`;
  }

  return `${indent}${edge.from} ${edgeSyntax} ${edge.to}`;
}

/**
 * Renders a subgraph to Mermaid syntax lines.
 *
 * @param subgraph - The subgraph to render
 * @returns Array of Mermaid syntax lines for the subgraph
 */
function renderSubgraph(subgraph: RenderableSubgraph): string[] {
  const lines: string[] = [];

  // Subgraph opening
  lines.push(`    subgraph ${subgraph.id}["${subgraph.label}"]`);

  // Direction override if specified
  if (subgraph.direction) {
    lines.push(`        direction ${subgraph.direction}`);
  }

  // Nodes within subgraph
  for (const node of subgraph.nodes) {
    lines.push(renderNode(node, "        "));
  }

  // Edges within subgraph
  for (const edge of subgraph.edges) {
    lines.push(renderEdge(edge, "        "));
  }

  // Close subgraph
  lines.push("    end");

  // Styles for nodes in subgraph (applied outside the subgraph block)
  for (const style of subgraph.styles) {
    lines.push(applyStyleClass(style.nodeId, style.className));
  }

  return lines;
}

/**
 * Renders a complete flowchart to a Mermaid definition string.
 *
 * @param data - The flowchart data to render
 * @returns The complete Mermaid flowchart definition
 */
export function renderFlowchart(data: FlowchartRenderData): string {
  const lines: string[] = [];

  // Add init directive if provided
  if (data.initDirective) {
    lines.push(data.initDirective);
  }

  // Add flowchart declaration
  lines.push(`flowchart ${data.direction}`);

  // Add style definitions if provided
  if (data.styleDefinitions) {
    lines.push(data.styleDefinitions);
  }

  // Add top-level nodes
  for (const node of data.nodes) {
    lines.push(renderNode(node, "    "));
  }

  // Add top-level edges
  for (const edge of data.edges) {
    lines.push(renderEdge(edge, "    "));
  }

  // Add subgraphs
  for (const subgraph of data.subgraphs) {
    lines.push(...renderSubgraph(subgraph));
  }

  // Add top-level styles
  for (const style of data.styles) {
    lines.push(applyStyleClass(style.nodeId, style.className));
  }

  // Add subgraph styles
  for (const subgraphStyle of data.subgraphStyles) {
    lines.push(`    style ${subgraphStyle.subgraphId} ${subgraphStyle.styleString}`);
  }

  return lines.join("\n");
}
