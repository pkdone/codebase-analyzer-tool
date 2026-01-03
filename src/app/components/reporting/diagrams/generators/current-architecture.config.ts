/**
 * Configuration for current/inferred architecture diagrams.
 * Used by CurrentArchitectureDiagramGenerator for inferred architecture visualizations.
 */
export const currentArchitectureConfig = {
  /** Default diagram width. */
  DEFAULT_WIDTH: 1600,
  /** Default diagram height. */
  DEFAULT_HEIGHT: 800,
  /** Minimum width for a node in pixels. */
  MIN_NODE_WIDTH: 200,
  /** Character width multiplier for node names. */
  CHAR_WIDTH_MULTIPLIER: 10,
  /** Extra padding added to node width for spacing. */
  WIDTH_PADDING: 200,
  /** Extra padding added to diagram height for layout. */
  HEIGHT_PADDING: 200,
  /** Height per vertical node for dynamic sizing. */
  HEIGHT_PER_NODE: 120,
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
