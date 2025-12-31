/**
 * Domain-specific style definitions for Mermaid diagrams.
 * These styles are used by various SVG generators to apply consistent
 * visual styling to domain model elements like bounded contexts, entities, etc.
 */

/**
 * Build Mermaid classDef style definitions for domain model visualization.
 * Uses Mermaid's classDef syntax for consistent styling across diagrams.
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
    classDef rootDependency fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#001e2b
    classDef internalComponent fill:#e8f5e8,stroke:#00684A,stroke-width:2px,color:#001e2b
    classDef externalComponent fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#001e2b`;
}

/**
 * Apply a style class to a node.
 */
export function applyStyle(nodeId: string, className: string): string {
  return `    class ${nodeId} ${className}`;
}
