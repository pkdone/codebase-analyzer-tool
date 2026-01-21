/**
 * Consolidated configuration for all diagram generators.
 * Centralizes diagram dimensions and layout settings for easy tuning.
 */

/**
 * Configuration for architecture diagrams (microservices architecture visualizations).
 */
export const architectureConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1400,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 500,
  /** Maximum services per row in grid layout. */
  SERVICES_PER_ROW: 3,
} as const;

/**
 * Configuration for current/inferred architecture diagrams.
 */
export const currentArchitectureConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1600,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 800,
  /** Mermaid init directive configuration for architecture diagrams. */
  mermaidInit: {
    /** Padding around the diagram content */
    DIAGRAM_PADDING: 50,
    /** Horizontal spacing between nodes */
    NODE_SPACING: 30,
    /** Vertical spacing between ranks/rows */
    RANK_SPACING: 60,
  },
} as const;

/**
 * Configuration for domain model diagrams (bounded context visualizations).
 */
export const domainModelConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1200,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 600,
} as const;

/**
 * Configuration for flowchart diagrams (business process visualizations).
 */
export const flowchartConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 800,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 200,
} as const;
