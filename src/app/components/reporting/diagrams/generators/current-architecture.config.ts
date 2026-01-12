/**
 * Configuration for current/inferred architecture diagrams.
 * Used by CurrentArchitectureDiagramGenerator for inferred architecture visualizations.
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
