/**
 * Pure utility functions for Mermaid diagram generation.
 * These functions have no external dependencies and can be used by any consumer.
 */

/**
 * Escape special characters in Mermaid node labels.
 * Mermaid uses certain characters for syntax, so we need to escape them.
 *
 * @param text - The text to escape
 * @returns The escaped text safe for use in Mermaid labels
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
 *
 * @param text - The text to convert to a node ID
 * @param index - A unique index to append to ensure uniqueness
 * @returns A sanitized node ID
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
 * Build an arrow connection between two nodes with an optional label.
 *
 * @param fromId - Source node ID
 * @param toId - Target node ID
 * @param label - Optional label for the edge
 * @returns The Mermaid syntax for the arrow connection
 */
export function buildArrow(fromId: string, toId: string, label?: string): string {
  if (label) {
    return `    ${fromId} -->|"${escapeMermaidLabel(label)}"| ${toId}`;
  }
  return `    ${fromId} --> ${toId}`;
}

/**
 * Apply a style class to a node.
 *
 * @param nodeId - The ID of the node to style
 * @param className - The style class name to apply
 * @returns The Mermaid syntax for applying the style
 */
export function applyStyleClass(nodeId: string, className: string): string {
  return `    class ${nodeId} ${className}`;
}
