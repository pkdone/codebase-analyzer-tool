/**
 * Centralized configuration for visualization generators (SVG diagrams).
 * Contains all default dimensions, limits, and rendering constants used by diagram generators.
 * This consolidates scattered constants to enable consistent theming and global tuning.
 */
export const visualizationConfig = {
  /**
   * Configuration for dependency tree diagrams.
   * Used by DependencyTreeSvgGenerator for Java class hierarchy visualizations.
   */
  dependencyTree: {
    /** Maximum depth for dependency tree traversal in Mermaid diagrams. */
    MAX_DEPTH: 10,
    /** Maximum number of nodes to include in a single diagram. */
    MAX_NODES_PER_DIAGRAM: 100,
    /** Maximum children to show per node to prevent overly wide diagrams. */
    MAX_CHILDREN_PER_NODE: 10,
    /** Default diagram width. */
    DEFAULT_WIDTH: 1200,
    /** Default diagram height. */
    DEFAULT_HEIGHT: 800,
    /** Maximum diagram width for dynamically calculated sizes. */
    MAX_WIDTH: 4000,
    /** Maximum diagram height for dynamically calculated sizes. */
    MAX_HEIGHT: 4000,
    /** Width multiplier per node for dynamic sizing. */
    WIDTH_PER_NODE: 50,
    /** Height multiplier per node for dynamic sizing. */
    HEIGHT_PER_NODE: 30,
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
    /** Minimum width per service in pixels. */
    MIN_WIDTH_PER_SERVICE: 180,
    /** Character width multiplier for service names. */
    CHAR_WIDTH_MULTIPLIER: 12,
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
} as const;

