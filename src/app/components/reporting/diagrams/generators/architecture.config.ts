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
  /** Extra padding for total diagram width. */
  WIDTH_PADDING: 100,
  /** Height per row in grid layout. */
  HEIGHT_PER_ROW: 100,
  /** Extra height for diagram padding. */
  HEIGHT_PADDING: 150,
} as const;
