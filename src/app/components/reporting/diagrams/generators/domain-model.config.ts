/**
 * Configuration for domain model diagrams.
 * Used by DomainModelDiagramGenerator for bounded context visualizations.
 */
export const domainModelConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1200,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 600,
  /** Width per node for dynamic sizing. */
  WIDTH_PER_NODE: 180,
  /** Minimum height for domain diagrams. */
  MIN_HEIGHT: 400,
} as const;
