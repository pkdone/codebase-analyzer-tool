/**
 * Centralized CSS class names for Mermaid diagram styling.
 * These class names are used in both style definitions (mermaid-styles.ts)
 * and diagram generators to ensure consistency.
 *
 * If a class name needs to change, update it here and all usages will
 * automatically be updated, preventing silent style application failures.
 */

/**
 * CSS class names for diagram elements.
 * Used by mermaid-styles.ts for style definitions and by diagram generators
 * for applying styles to nodes.
 */
export const DIAGRAM_CSS_CLASSES = {
  /** Style class for bounded context nodes in domain model diagrams */
  BOUNDED_CONTEXT: "boundedContext",
  /** Style class for aggregate nodes in domain model diagrams */
  AGGREGATE: "aggregate",
  /** Style class for entity nodes in domain model diagrams */
  ENTITY: "entity",
  /** Style class for repository nodes in domain model diagrams */
  REPOSITORY: "repository",
  /** Style class for service nodes in architecture diagrams */
  SERVICE: "service",
  /** Style class for process nodes in flowchart diagrams */
  PROCESS: "process",
  /** Style class for dependency nodes */
  DEPENDENCY: "dependency",
  /** Style class for root dependency nodes */
  ROOT_DEPENDENCY: "rootDependency",
  /** Style class for internal component nodes in architecture diagrams */
  INTERNAL_COMPONENT: "internalComponent",
  /** Style class for external component nodes in architecture diagrams */
  EXTERNAL_COMPONENT: "externalComponent",
} as const;

/**
 * Type representing valid diagram CSS class names.
 * Can be used for compile-time validation when applying styles.
 */
export type DiagramCssClassName = (typeof DIAGRAM_CSS_CLASSES)[keyof typeof DIAGRAM_CSS_CLASSES];

/**
 * Array of all diagram CSS class names for iteration purposes.
 * Useful for tests and validation.
 */
export const ALL_DIAGRAM_CSS_CLASS_NAMES: readonly DiagramCssClassName[] = Object.values(
  DIAGRAM_CSS_CLASSES,
);
