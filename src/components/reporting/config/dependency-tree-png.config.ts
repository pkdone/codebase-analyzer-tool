/**
 * Configuration for dependency tree PNG generation.
 * Contains all layout, styling, and rendering constants.
 */
export const dependencyTreePngConfig = {
  /** Layout dimensions for normal mode */
  layout: {
    NODE_WIDTH: 400,
    NODE_HEIGHT: 45,
    LEVEL_HEIGHT: 80,
    HORIZONTAL_SPACING: 20,
    VERTICAL_SPACING: 15,
    FONT_SIZE: 12,
    CANVAS_PADDING: 40,
  },

  /** Layout dimensions for compact mode (used for large trees) */
  compactLayout: {
    NODE_WIDTH: 350,
    NODE_HEIGHT: 30,
    LEVEL_HEIGHT: 45,
    HORIZONTAL_SPACING: 15,
    VERTICAL_SPACING: 10,
    FONT_SIZE: 10,
    CANVAS_PADDING: 25,
  },

  /** Canvas size constraints */
  canvas: {
    MAX_WIDTH: 8000,
    MAX_HEIGHT: 8000,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
    /** Number of nodes that triggers compact mode */
    COMPLEX_TREE_THRESHOLD: 50,
  },

  /** Color scheme */
  colors: {
    WHITE: "#ffffff",
    ROOT_BACKGROUND: "#e8f4fd",
    NODE_BACKGROUND: "#f5f5f5",
    ROOT_BORDER: "#2196F3",
    NODE_BORDER: "#cccccc",
    CONNECTION: "#cccccc",
    TEXT: "#333333",
    LEVEL_INDICATOR: "#666666",
  } as const,

  /** Text rendering constants */
  text: {
    FONT_FAMILY: "Arial",
    FONT_WEIGHT_BOLD: "bold ",
    LEVEL_PREFIX: "L",
    TITLE_PREFIX: "Dependency Tree: ",
  } as const,

  /** File output settings */
  file: {
    FORMAT: "image/png" as const,
    EXTENSION: ".png",
  } as const,

  /** Numeric constants for positioning and styling */
  numeric: {
    TITLE_Y_POSITION: 25,
    TEXT_PADDING_REGULAR: 5,
    TEXT_PADDING_COMPACT: 3,
    LEVEL_PADDING_REGULAR: 5,
    LEVEL_PADDING_COMPACT: 3,
    LEVEL_Y_REGULAR: 15,
    LEVEL_Y_COMPACT: 12,
    STAGGER_OFFSET: 8,
    ARROW_LENGTH: 10,
    ARROW_ANGLE_DEGREES: 30,
    ARROW_ANGLE_RADIANS: Math.PI / 6,
    FONT_SIZE_TITLE_OFFSET: 4,
    FONT_SIZE_LEVEL_OFFSET_REGULAR: 2,
    FONT_SIZE_LEVEL_OFFSET_COMPACT: 1,
    BORDER_WIDTH_ROOT: 2,
    BORDER_WIDTH_NODE: 1,
    CONNECTION_WIDTH: 2,
    /** Pixels to adjust text baseline for visual centering */
    TEXT_BASELINE_ADJUSTMENT: 2,
    /** Maximum recursion depth to prevent infinite loops or excessive memory usage */
    MAX_RECURSION_DEPTH: 4,
  } as const,
} as const;
