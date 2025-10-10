/**
 * Configuration for pie chart PNG generation.
 * Contains all layout, styling, and rendering constants.
 */
export const pieChartConfig = {
  /** Layout dimensions */
  layout: {
    PIE_RADIUS: 275,
    PIE_CENTER_X: 300,
    PIE_CENTER_Y: 313,
    LEGEND_X: 650,
    LEGEND_Y: 38,
    LEGEND_ITEM_HEIGHT: 31,
    FONT_SIZE: 18,
    CANVAS_PADDING: 25,
  },

  /** Predefined color palette for pie slices */
  sliceColors: [
    "#2196F3", // Blue
    "#4CAF50", // Green
    "#FF9800", // Orange
    "#9C27B0", // Purple
    "#F44336", // Red
    "#00BCD4", // Cyan
    "#8BC34A", // Light Green
    "#E91E63", // Pink
    "#607D8B", // Blue Grey
    "#795548", // Brown
    "#FFC107", // Amber
    "#3F51B5", // Indigo
    "#009688", // Teal
    "#CDDC39", // Lime
    "#FF5722", // Deep Orange
  ],

  /** Colors for drawing elements */
  colors: {
    SLICE_BORDER: "#ffffff",
    TEXT_STROKE: "#000000",
    TEXT: "#333333",
    LEGEND_BORDER: "#cccccc",
    NO_DATA_TEXT: "#666666",
  } as const,

  /** Text rendering constants */
  text: {
    FONT_FAMILY: "Arial",
    FONT_WEIGHT_BOLD: "bold ",
    PERCENTAGE_SUFFIX: "%",
    FILES_SUFFIX: " files)",
    FILES_PREFIX: " (",
    NO_DATA_MESSAGE: "No file types data available",
  } as const,

  /** Dynamic color generation settings */
  dynamicColor: {
    GOLDEN_ANGLE: 137.5,
    SATURATION: 65,
    LIGHTNESS: 50,
    HSL_PREFIX: "hsl(",
    HSL_SEPARATOR: ", ",
    HSL_SUFFIX: "%)",
  } as const,

  /** File output settings */
  file: {
    FORMAT: "image/png" as const,
    DEFAULT_FILENAME: "file-types-pie-chart.png",
  } as const,

  /** Numeric constants for positioning and styling */
  numeric: {
    /** Minimum percentage to show label on slice */
    PERCENTAGE_THRESHOLD: 3,
    LEGEND_BOX_SIZE: 15,
    LEGEND_BOX_OFFSET: 10,
    LEGEND_TEXT_OFFSET: 20,
    LABEL_RADIUS_FACTOR: 0.75,
    EMPTY_CANVAS_WIDTH: 400,
    EMPTY_CANVAS_HEIGHT: 100,
    MAX_CANVAS_WIDTH: 1200,
    MAX_CANVAS_HEIGHT: 700,
    MIN_LEGEND_WIDTH: 200,
    TEXT_WIDTH_ESTIMATE: 8,
    LEGEND_WIDTH_PADDING: 50,
  } as const,
} as const;
