/**
 * Utility functions for building Mermaid diagram definitions from business data.
 * Each builder converts a specific data structure into Mermaid syntax.
 */

/**
 * Shared styling constants for SVG diagrams.
 */
export const DIAGRAM_STYLES = {
  /** Background color for rendered Mermaid diagrams */
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
 * Generate the Mermaid init directive for consistent diagram configuration.
 * This adds padding around the diagram content.
 */
export function buildMermaidInitDirective(): string {
  return `%%{init: {'flowchart': {'diagramPadding': ${DIAGRAM_STYLES.diagramPadding}}}}%%`;
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
 * Build a simple flowchart node definition with a rectangular shape.
 */
export function buildRectNode(id: string, label: string): string {
  return `    ${id}["${escapeMermaidLabel(label)}"]`;
}

/**
 * Build a rounded rectangle node (for entities).
 */
export function buildRoundedNode(id: string, label: string): string {
  return `    ${id}("${escapeMermaidLabel(label)}")`;
}

/**
 * Build a stadium-shaped node (pill shape, for aggregates).
 */
export function buildStadiumNode(id: string, label: string): string {
  return `    ${id}(["${escapeMermaidLabel(label)}"])`;
}

/**
 * Build a circle node (for repositories).
 */
export function buildCircleNode(id: string, label: string): string {
  return `    ${id}(("${escapeMermaidLabel(label)}"))`;
}

/**
 * Build a hexagon node (for bounded contexts).
 */
export function buildHexagonNode(id: string, label: string): string {
  return `    ${id}{{"${escapeMermaidLabel(label)}"}}`;
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

/**
 * Build a dashed arrow connection between two nodes.
 */
export function buildDashedArrow(fromId: string, toId: string, label?: string): string {
  if (label) {
    return `    ${fromId} -.->|"${escapeMermaidLabel(label)}"| ${toId}`;
  }
  return `    ${fromId} -.-> ${toId}`;
}

/**
 * Build a subgraph block.
 */
export function buildSubgraph(id: string, label: string, content: string[]): string {
  const lines = [
    `    subgraph ${id}["${escapeMermaidLabel(label)}"]`,
    ...content.map((line) => `    ${line}`),
    "    end",
  ];
  return lines.join("\n");
}

/**
 * Build style definitions for nodes.
 * Uses Mermaid's classDef syntax for consistent styling.
 */
export function buildStyleDefinitions(): string {
  return `
    classDef boundedContext fill:#e8f5e8,stroke:#00684A,stroke-width:3px,color:#001e2b
    classDef aggregate fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#001e2b
    classDef entity fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1.5px,color:#001e2b
    classDef repository fill:#fff5f0,stroke:#d2691e,stroke-width:1.5px,color:#001e2b
    classDef service fill:#ffffff,stroke:#00684A,stroke-width:2px,color:#001e2b
    classDef process fill:#ffffff,stroke:#00684A,stroke-width:2px,color:#001e2b
    classDef dependency fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,color:#001e2b
    classDef rootDependency fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#001e2b`;
}

/**
 * Apply a style class to a node.
 */
export function applyStyle(nodeId: string, className: string): string {
  return `    class ${nodeId} ${className}`;
}
