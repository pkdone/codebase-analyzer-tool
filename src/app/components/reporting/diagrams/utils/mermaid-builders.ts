/**
 * Utility functions for building Mermaid diagram definitions from business data.
 * Each builder converts a specific data structure into Mermaid syntax.
 *
 * Core Mermaid utilities (escapeMermaidLabel, generateNodeId, buildArrow) are
 * imported from the common module to maintain a single source of truth.
 */

import { currentArchitectureConfig } from "../diagrams.config";
import { DIAGRAM_STYLES } from "../../config/brand-theme.config";

// Re-export common Mermaid utilities for convenience
export {
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "../../../../../common/diagrams/mermaid/mermaid-utils";

/**
 * Generate the Mermaid init directive for consistent diagram configuration.
 * This adds padding around the diagram content.
 */
export function buildMermaidInitDirective(): string {
  return `%%{init: {'flowchart': {'diagramPadding': ${DIAGRAM_STYLES.diagramPadding}}}}%%`;
}

/**
 * Generate the Mermaid init directive for architecture diagrams.
 * Includes additional spacing configuration for better node distribution.
 */
export function buildArchitectureInitDirective(): string {
  const { mermaidInit } = currentArchitectureConfig;
  return `%%{init: {'flowchart': {'diagramPadding': ${mermaidInit.DIAGRAM_PADDING}, 'nodeSpacing': ${mermaidInit.NODE_SPACING}, 'rankSpacing': ${mermaidInit.RANK_SPACING}}}}%%`;
}

/**
 * Generate an empty diagram SVG placeholder with consistent styling.
 */
export function generateEmptyDiagramSvg(message: string): string {
  return `<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg" style="background-color: ${DIAGRAM_STYLES.backgroundColor}; border-radius: 8px;">
      <text x="200" y="50" text-anchor="middle" font-family="${DIAGRAM_STYLES.emptyDiagramFontFamily}" font-size="${DIAGRAM_STYLES.emptyDiagramFontSize}" fill="${DIAGRAM_STYLES.emptyDiagramTextColor}">${message}</text>
    </svg>`;
}
