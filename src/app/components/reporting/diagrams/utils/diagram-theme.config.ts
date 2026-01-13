/**
 * Theme configuration for Mermaid diagrams.
 * Centralizes visual styling constants used by diagram builders and generators.
 * Colors are sourced from the central theme configuration where applicable.
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

// Re-export brand colors for consumers that need direct access
export { BRAND_COLORS };
