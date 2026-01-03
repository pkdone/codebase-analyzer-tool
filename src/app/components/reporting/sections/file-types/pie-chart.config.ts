/**
 * Configuration for pie chart visualizations.
 * Used by FileTypesSection for file type distribution charts.
 */
export const pieChartConfig = {
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
} as const;
