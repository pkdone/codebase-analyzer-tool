/**
 * Mermaid diagram builders - type-safe fluent APIs for diagram construction.
 *
 * The generic builder classes are imported from the common module.
 * App-specific styling is injected via the createFlowchartBuilder factory.
 */

// Re-export core builder types from common module
export {
  MermaidFlowchartBuilder,
  SubgraphBuilder,
  AbstractGraphBuilder,
  GraphValidationError,
  type FlowchartDirection,
  type FlowchartBuilderOptions,
  type NodeShape,
  type EdgeType,
  type MermaidNode,
  type MermaidEdge,
  type StyleApplication,
} from "../../../../../common/diagrams/mermaid";

// Export the app-specific factory for creating builders with configured styles
export {
  createFlowchartBuilder,
  type InitDirectiveType,
  type CreateFlowchartBuilderOptions,
} from "./flowchart-builder-factory";
