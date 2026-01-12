/**
 * Type definitions for pie chart visualization data.
 * These types are used by pie-chart-calculator.ts and consumed by html-report-writer.ts.
 */

/**
 * Represents a single slice in the pie chart visualization.
 * Pre-computed by FileTypesSection for template rendering.
 */
export interface PieChartSlice {
  /** Label for the slice (file type name) */
  label: string;
  /** Number of files of this type */
  value: number;
  /** Percentage of total files */
  percentage: number;
  /** Fill color for the slice */
  color: string;
  /** SVG path 'd' attribute for the slice */
  pathData: string;
  /** X coordinate for label placement (if shown) */
  labelX: number;
  /** Y coordinate for label placement (if shown) */
  labelY: number;
  /** Whether to show the percentage label on this slice */
  showLabel: boolean;
}

/**
 * Pre-computed pie chart data for template rendering.
 */
export interface PieChartData {
  /** Total number of files across all types */
  totalFiles: number;
  /** Computed SVG viewport height */
  svgHeight: number;
  /** Computed SVG viewport width */
  svgWidth: number;
  /** Pre-computed slices with all rendering data */
  slices: PieChartSlice[];
  /** Configuration values needed by the template */
  config: {
    centerX: number;
    centerY: number;
    legendX: number;
    legendY: number;
    legendItemHeight: number;
    legendBoxSize: number;
  };
}
