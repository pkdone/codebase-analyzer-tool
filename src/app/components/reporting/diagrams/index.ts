/**
 * Diagrams module - Consolidated Mermaid diagram generation
 *
 * This module provides diagram generators for various visualizations
 * in the codebase analysis reports. All generators produce Mermaid
 * definitions that are rendered client-side.
 *
 * @example
 * ```typescript
 * import { ArchitectureDiagramGenerator, DomainModelDiagramGenerator } from "./diagrams";
 * ```
 */

// Re-export generators
export * from "./generators";

// Re-export utilities (for advanced use cases)
export * from "./utils";
