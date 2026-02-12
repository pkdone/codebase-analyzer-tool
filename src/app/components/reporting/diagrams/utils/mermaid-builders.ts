/**
 * App-specific utility functions for building Mermaid diagram definitions.
 * Provides initialization directives and placeholder SVGs that depend on
 * application configuration (brand styles, layout presets).
 *
 * For core Mermaid utilities (escapeMermaidLabel, generateNodeId, buildArrow,
 * applyStyleClass), import directly from the common module:
 * `src/common/diagrams/mermaid`
 */

import { currentArchitectureConfig } from "../diagrams.config";
import { DIAGRAM_STYLES } from "../../config/brand-theme.config";

/**
 * Generate the Mermaid init directive for compact diagrams.
 * This adds minimal padding around the diagram content.
 */
export function buildCompactInitDirective(): string {
  return `%%{init: {'flowchart': {'diagramPadding': ${DIAGRAM_STYLES.diagramPadding}}}}%%`;
}

/**
 * Generate the Mermaid init directive for spacious diagrams.
 * Includes additional spacing configuration for better node distribution.
 */
export function buildSpaciousInitDirective(): string {
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
