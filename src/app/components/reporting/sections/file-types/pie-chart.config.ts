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
  /**
   * Color palette for pie chart slices.
   *
   * Note: These colors are intentionally different from BRAND_COLORS in theme.config.ts.
   * Pie charts require many distinct, visually distinguishable colors for effective data
   * visualization (15+ categories), while the MongoDB brand palette only contains 7 colors.
   * Using Material Design colors here provides better visual separation between slices.
   *
   * If more than 15 slices are needed, the pie-chart-calculator generates additional colors
   * using the golden angle algorithm for even hue distribution.
   *
   * @see pie-chart-calculator.ts for color assignment logic
   * @see theme.config.ts for MongoDB brand colors used in semantic UI elements
   */
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
