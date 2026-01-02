/**
 * Pie chart calculation utilities for file type visualizations.
 * Separates geometry and rendering logic from the EJS template.
 */

import { visualizationConfig } from "../../generators/visualization.config";
import type { PieChartData, PieChartSlice } from "../../html-report-writer";

const pieConfig = visualizationConfig.pieChart;

/**
 * File type data structure expected as input.
 */
export interface FileTypeData {
  fileType: string;
  files: number;
  lines: number;
}

/**
 * Generate color for a pie chart slice.
 * Uses the predefined color palette for initial colors,
 * then generates additional colors using the golden angle for visual distribution.
 *
 * @param index - The slice index
 * @returns A CSS color string
 */
export function getSliceColor(index: number): string {
  if (index < pieConfig.COLORS.length) {
    return pieConfig.COLORS[index];
  }
  // Generate dynamic color using golden angle for even distribution
  const hue = ((index - pieConfig.COLORS.length) * 137.5) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Calculate the SVG path data for an arc segment (pie slice).
 * Uses the standard SVG arc path syntax.
 *
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param r - Radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns SVG path 'd' attribute string
 */
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  };
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

/**
 * Calculate all pie chart data from file type statistics.
 * This function performs all geometry calculations that were previously in the EJS template.
 *
 * @param fileTypesData - Array of file type statistics
 * @returns Complete pie chart data ready for template rendering
 */
export function calculatePieChartData(fileTypesData: FileTypeData[]): PieChartData {
  const totalFiles = fileTypesData.reduce((sum, item) => sum + item.files, 0);

  // Calculate SVG dimensions based on content
  const legendHeight =
    fileTypesData.length * pieConfig.LEGEND_ITEM_HEIGHT + pieConfig.LEGEND_Y + 20;
  const pieHeight = pieConfig.CENTER_Y + pieConfig.RADIUS + 20;
  const svgHeight = Math.max(legendHeight, pieHeight);

  // Calculate pie slices with angles - start at 12 o'clock (-π/2)
  let currentAngle = -Math.PI / 2;
  const slices: PieChartSlice[] = fileTypesData.map((item, index) => {
    const percentage = totalFiles > 0 ? (item.files / totalFiles) * 100 : 0;
    const sliceAngle = totalFiles > 0 ? (item.files / totalFiles) * 2 * Math.PI : 0;

    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // Calculate label position (mid-point of slice)
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = pieConfig.RADIUS * pieConfig.LABEL_RADIUS_MULTIPLIER;
    const labelX = pieConfig.CENTER_X + Math.cos(midAngle) * labelRadius;
    const labelY = pieConfig.CENTER_Y + Math.sin(midAngle) * labelRadius;

    // Generate path data for the slice
    const pathData = describeArc(
      pieConfig.CENTER_X,
      pieConfig.CENTER_Y,
      pieConfig.RADIUS,
      startAngle,
      endAngle,
    );

    const slice: PieChartSlice = {
      label: item.fileType || "unknown",
      value: item.files,
      percentage,
      color: getSliceColor(index),
      pathData,
      labelX,
      labelY,
      showLabel: percentage >= pieConfig.LABEL_THRESHOLD_PERCENT,
    };

    currentAngle += sliceAngle;
    return slice;
  });

  return {
    totalFiles,
    svgHeight,
    svgWidth: pieConfig.SVG_WIDTH,
    slices,
    config: {
      centerX: pieConfig.CENTER_X,
      centerY: pieConfig.CENTER_Y,
      legendX: pieConfig.LEGEND_X,
      legendY: pieConfig.LEGEND_Y,
      legendItemHeight: pieConfig.LEGEND_ITEM_HEIGHT,
      legendBoxSize: pieConfig.LEGEND_BOX_SIZE,
    },
  };
}
