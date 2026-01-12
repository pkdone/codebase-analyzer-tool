/**
 * Configuration for architecture diagrams.
 * Used by ArchitectureDiagramGenerator for microservices architecture visualizations.
 */
export const architectureConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1400,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 500,
  /** Maximum services per row in grid layout. */
  SERVICES_PER_ROW: 3,
} as const;
