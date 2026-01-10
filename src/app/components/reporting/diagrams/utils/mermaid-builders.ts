/**
 * Utility functions for building Mermaid diagram definitions from business data.
 * Each builder converts a specific data structure into Mermaid syntax.
 */

import { currentArchitectureConfig } from "../generators/current-architecture.config";
import { DIAGRAM_STYLES } from "./diagram-theme.config";

// Re-export for backwards compatibility with existing imports
export { DIAGRAM_STYLES };

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

/**
 * Escape special characters in Mermaid node labels.
 * Mermaid uses certain characters for syntax, so we need to escape them.
 */
export function escapeMermaidLabel(text: string): string {
  return text
    .replace(/"/g, "#quot;")
    .replace(/</g, "#lt;")
    .replace(/>/g, "#gt;")
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;")
    .replace(/\(/g, "#40;")
    .replace(/\)/g, "#41;")
    .replace(/\{/g, "#123;")
    .replace(/\}/g, "#125;");
}

/**
 * Generate a safe node ID from a string.
 * Node IDs in Mermaid must not contain spaces or special characters.
 */
export function generateNodeId(text: string, index: number): string {
  const sanitized = text
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  return `${sanitized}_${index}`;
}

/**
 * Build an arrow connection between two nodes.
 */
export function buildArrow(fromId: string, toId: string, label?: string): string {
  if (label) {
    return `    ${fromId} -->|"${escapeMermaidLabel(label)}"| ${toId}`;
  }
  return `    ${fromId} --> ${toId}`;
}
