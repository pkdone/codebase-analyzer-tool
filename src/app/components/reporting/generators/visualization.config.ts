/**
 * Centralized configuration for visualization generators (SVG diagrams).
 * Contains all default dimensions, limits, and rendering constants used by diagram generators.
 * This consolidates scattered constants to enable consistent theming and global tuning.
 */
export const visualizationConfig = {
  /**
   * Configuration for pie chart visualizations.
   * Used by FileTypesSection for file type distribution charts.
   */
  pieChart: {
    /** X coordinate of pie chart center */
    CENTER_X: 300,
    /** Y coordinate of pie chart center */
    CENTER_Y: 300,
    /** Radius of the pie chart */
    RADIUS: 250,
    /** X position of the legend */
    LEGEND_X: 620,
    /** Y position of the legend */
    LEGEND_Y: 30,
    /** Height per legend item */
    LEGEND_ITEM_HEIGHT: 28,
    /** Size of legend color box */
    LEGEND_BOX_SIZE: 14,
    /** Minimum percentage threshold for showing label on slice */
    LABEL_THRESHOLD_PERCENT: 3,
    /** Radius multiplier for label positioning (0-1) */
    LABEL_RADIUS_MULTIPLIER: 0.7,
    /** Total SVG width */
    SVG_WIDTH: 950,
    /** Color palette for pie chart slices */
    COLORS: [
      "#2196F3",
      "#4CAF50",
      "#FF9800",
      "#9C27B0",
      "#F44336",
      "#00BCD4",
      "#8BC34A",
      "#E91E63",
      "#607D8B",
      "#795548",
      "#FFC107",
      "#3F51B5",
      "#009688",
      "#CDDC39",
      "#FF5722",
    ],
  },

  /**
   * Configuration for architecture diagrams.
   * Used by ArchitectureSvgGenerator for microservices architecture visualizations.
   */
  architecture: {
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
  },

  /**
   * Configuration for domain model diagrams.
   * Used by DomainModelSvgGenerator for bounded context visualizations.
   */
  domainModel: {
    /** Default diagram width. */
    DEFAULT_WIDTH: 1200,
    /** Default diagram height. */
    DEFAULT_HEIGHT: 600,
    /** Width per node for dynamic sizing. */
    WIDTH_PER_NODE: 180,
    /** Minimum height for domain diagrams. */
    MIN_HEIGHT: 400,
  },

  /**
   * Configuration for flowchart diagrams.
   * Used by FlowchartSvgGenerator for business process visualizations.
   */
  flowchart: {
    /** Default diagram width. */
    DEFAULT_WIDTH: 800,
    /** Default diagram height. */
    DEFAULT_HEIGHT: 200,
    /** Width per activity node for dynamic sizing. */
    WIDTH_PER_ACTIVITY: 200,
  },

  /**
   * Configuration for current/inferred architecture diagrams.
   * Used by CurrentArchitectureSvgGenerator for inferred architecture visualizations.
   */
  currentArchitecture: {
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
  },
} as const;
