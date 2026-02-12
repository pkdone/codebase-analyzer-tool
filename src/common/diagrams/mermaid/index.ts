/**
 * Reusable Mermaid diagram building utilities.
 *
 * This module provides generic, framework-agnostic utilities for building Mermaid diagrams.
 * Styles and configuration are injectable to allow customization without coupling to
 * specific application configurations.
 */

// Core builder classes
export {
  MermaidFlowchartBuilder,
  SubgraphBuilder,
  type FlowchartBuilderOptions,
  type FlowchartDirection,
  type NodeShape,
  type EdgeType,
} from "./mermaid-flowchart-builder";

// Abstract base class and types
export {
  AbstractGraphBuilder,
  GraphValidationError,
  type MermaidNode,
  type MermaidEdge,
  type StyleApplication,
} from "./abstract-graph-builder";

// Pure rendering functions
export {
  renderFlowchart,
  type FlowchartRenderData,
  type RenderableSubgraph,
  type SubgraphStyleApplication,
} from "./flowchart-renderer";

// Pure utility functions
export { escapeMermaidLabel, generateNodeId, buildArrow, applyStyleClass } from "./mermaid-utils";
