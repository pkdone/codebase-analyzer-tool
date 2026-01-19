/**
 * Theme configuration for Mermaid diagrams.
 * Centralizes visual styling constants used by diagram builders and generators.
 * Brand colors are sourced from the central theme configuration.
 */

import { BRAND_COLORS } from "../../../../config/theme.config";

/**
 * Shared styling constants for SVG diagrams.
 * Used by mermaid-builders.ts and diagram generators for consistent styling.
 */
export const DIAGRAM_STYLES = {
  /** Background color for rendered Mermaid diagrams (derived from brand greys) */
  backgroundColor: "#F0F3F2",
  /** Padding around the diagram content within the SVG canvas */
  diagramPadding: 30,
  /** Font family for empty diagram placeholders */
  emptyDiagramFontFamily: "system-ui, sans-serif",
  /** Font size for empty diagram placeholder text */
  emptyDiagramFontSize: "14",
  /** Text color for empty diagram placeholder messages */
  emptyDiagramTextColor: "#8b95a1",
} as const;

/**
 * Semantic colors for diagram elements.
 * Maps domain concepts to specific colors for consistent visualization.
 * These are specific to reporting diagrams and not used elsewhere in the application.
 */
export const DIAGRAM_ELEMENT_COLORS = {
  /** Bounded context fill color (light green) */
  boundedContextFill: "#e8f5e8",
  /** Aggregate fill color (light blue) */
  aggregateFill: "#e3f2fd",
  /** Aggregate stroke color (blue) */
  aggregateStroke: "#1976d2",
  /** Entity fill color (light purple) */
  entityFill: "#f3e5f5",
  /** Entity stroke color (purple) */
  entityStroke: "#7b1fa2",
  /** Repository fill color (light orange) */
  repositoryFill: "#fff5f0",
  /** Repository stroke color (orange) */
  repositoryStroke: "#d2691e",
  /** External component fill color (light orange) */
  externalComponentFill: "#fff3e0",
  /** External component stroke color (orange) */
  externalComponentStroke: "#e65100",
  /** Dependency fill color (light grey) */
  dependencyFill: "#f8f9fa",
  /** Dependency stroke color (grey) */
  dependencyStroke: "#6c757d",
} as const;

/**
 * Type representing the diagram element color keys.
 */
export type DiagramElementColorKey = keyof typeof DIAGRAM_ELEMENT_COLORS;

// Re-export brand colors for consumers that need direct access
export { BRAND_COLORS };
