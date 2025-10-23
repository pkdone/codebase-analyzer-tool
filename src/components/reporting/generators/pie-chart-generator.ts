import { injectable } from "tsyringe";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";
import { writeBinaryFile } from "../../../common/fs/file-operations";
import type { ProjectedFileTypesCountAndLines } from "../../../repositories/sources/sources.model";
import { pieChartConfig } from "../config/pie-chart.config";

interface PieSlice {
  label: string;
  value: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

/**
 * Generates pie chart PNG images for data visualization.
 * Creates visual representations of data distributions using Canvas API.
 */
@injectable()
export class PieChartGenerator {
  /**
   * Generate a pie chart PNG for file types data
   */
  async generateFileTypesPieChart(
    fileTypesData: ProjectedFileTypesCountAndLines[],
    outputDir: string,
    filename = pieChartConfig.file.DEFAULT_FILENAME,
  ): Promise<string> {
    // Calculate total files for percentages
    const totalFiles = fileTypesData.reduce((sum, item) => sum + item.files, 0);
    if (totalFiles === 0) return await this.generateEmptyChart(outputDir, filename);

    // Create pie slices data
    const slices = this.createPieSlices(fileTypesData, totalFiles);

    // Calculate optimal canvas dimensions based on content
    const { width, height } = this.calculateOptimalCanvasSize(slices);

    // Create canvas with calculated dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Draw the pie chart (no background fill for transparency)
    this.drawPieChart(ctx, slices);

    // Save to file
    const filepath = path.join(outputDir, filename);
    const buffer = canvas.toBuffer(pieChartConfig.file.FORMAT);
    await writeBinaryFile(filepath, buffer);
    return filename;
  }

  /**
   * Generate color for pie slice - uses predefined colors first, then generates unique HSL colors
   */
  private generateColor(index: number): string {
    if (index < pieChartConfig.sliceColors.length) {
      // Use predefined color palette for first 15 slices
      return pieChartConfig.sliceColors[index];
    }

    // Generate dynamic colors using HSL for additional slices
    // Use golden angle for good color distribution
    const hue =
      ((index - pieChartConfig.sliceColors.length) * pieChartConfig.dynamicColor.GOLDEN_ANGLE) %
      360;

    return `${pieChartConfig.dynamicColor.HSL_PREFIX}${hue}${pieChartConfig.dynamicColor.HSL_SEPARATOR}${pieChartConfig.dynamicColor.SATURATION}${pieChartConfig.text.PERCENTAGE_SUFFIX}${pieChartConfig.dynamicColor.HSL_SEPARATOR}${pieChartConfig.dynamicColor.LIGHTNESS}${pieChartConfig.dynamicColor.HSL_SUFFIX}`;
  }

  /**
   * Create pie slices data with angles and colors
   */
  private createPieSlices(
    fileTypesData: ProjectedFileTypesCountAndLines[],
    totalFiles: number,
  ): PieSlice[] {
    let currentAngle = 0;
    return fileTypesData.map((item, index) => {
      const percentage = (item.files / totalFiles) * 100;
      const sliceAngle = (item.files / totalFiles) * 2 * Math.PI;
      const slice: PieSlice = {
        label: item.fileType,
        value: item.files,
        percentage: percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        color: this.generateColor(index),
      };
      currentAngle += sliceAngle;
      return slice;
    });
  }

  /**
   * Calculate optimal canvas size based on pie chart and legend content
   */
  private calculateOptimalCanvasSize(slices: PieSlice[]): { width: number; height: number } {
    // Calculate minimum width needed: pie circle + spacing + legend
    const pieWidth =
      pieChartConfig.layout.PIE_CENTER_X +
      pieChartConfig.layout.PIE_RADIUS +
      pieChartConfig.layout.CANVAS_PADDING;

    // Calculate legend width (approximate based on longest text)
    const maxLabelLength = Math.max(...slices.map((s) => s.label.length));
    const estimatedLegendWidth = Math.max(
      pieChartConfig.numeric.MIN_LEGEND_WIDTH,
      maxLabelLength * pieChartConfig.numeric.TEXT_WIDTH_ESTIMATE +
        pieChartConfig.numeric.LEGEND_WIDTH_PADDING,
    );
    const totalWidth = Math.max(
      pieWidth,
      pieChartConfig.layout.LEGEND_X + estimatedLegendWidth + pieChartConfig.layout.CANVAS_PADDING,
    );

    // Calculate minimum height needed: pie circle or legend height
    const pieHeight =
      pieChartConfig.layout.PIE_CENTER_Y +
      pieChartConfig.layout.PIE_RADIUS +
      pieChartConfig.layout.CANVAS_PADDING;
    const legendHeight =
      pieChartConfig.layout.LEGEND_Y +
      slices.length * pieChartConfig.layout.LEGEND_ITEM_HEIGHT +
      pieChartConfig.layout.CANVAS_PADDING;
    const totalHeight = Math.max(pieHeight, legendHeight);
    return {
      width: Math.min(totalWidth, pieChartConfig.numeric.MAX_CANVAS_WIDTH), // Cap at reasonable maximum
      height: Math.min(totalHeight, pieChartConfig.numeric.MAX_CANVAS_HEIGHT),
    };
  }

  /**
   * Draw the complete pie chart with legend (transparent background, no title)
   */
  private drawPieChart(ctx: CanvasRenderingContext2D, slices: PieSlice[]): void {
    this.drawPieSlices(ctx, slices);
    this.drawLegend(ctx, slices);
  }

  /**
   * Draw all pie slices
   */
  private drawPieSlices(ctx: CanvasRenderingContext2D, slices: PieSlice[]): void {
    for (const slice of slices) {
      // Draw slice
      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.moveTo(pieChartConfig.layout.PIE_CENTER_X, pieChartConfig.layout.PIE_CENTER_Y);
      ctx.arc(
        pieChartConfig.layout.PIE_CENTER_X,
        pieChartConfig.layout.PIE_CENTER_Y,
        pieChartConfig.layout.PIE_RADIUS,
        slice.startAngle,
        slice.endAngle,
      );
      ctx.closePath();
      ctx.fill();

      // Draw slice border
      ctx.strokeStyle = pieChartConfig.colors.SLICE_BORDER;
      ctx.lineWidth = pieChartConfig.numeric.SLICE_BORDER_WIDTH;
      ctx.stroke();

      // Draw percentage label on slice (if slice is large enough)
      if (slice.percentage >= pieChartConfig.numeric.PERCENTAGE_THRESHOLD) {
        this.drawSliceLabel(ctx, slice);
      }
    }
  }

  /**
   * Draw percentage label on a pie slice
   */
  private drawSliceLabel(ctx: CanvasRenderingContext2D, slice: PieSlice): void {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const labelRadius =
      pieChartConfig.layout.PIE_RADIUS * pieChartConfig.numeric.LABEL_RADIUS_FACTOR;
    const labelX = pieChartConfig.layout.PIE_CENTER_X + Math.cos(midAngle) * labelRadius;
    const labelY = pieChartConfig.layout.PIE_CENTER_Y + Math.sin(midAngle) * labelRadius;
    ctx.font = `${pieChartConfig.text.FONT_WEIGHT_BOLD}${pieChartConfig.layout.FONT_SIZE + pieChartConfig.numeric.SLICE_LABEL_FONT_OFFSET}px ${pieChartConfig.text.FONT_FAMILY}`;
    ctx.fillStyle = pieChartConfig.colors.SLICE_BORDER;
    ctx.textAlign = "center";
    ctx.strokeStyle = pieChartConfig.colors.TEXT_STROKE;
    ctx.lineWidth = pieChartConfig.numeric.TEXT_STROKE_WIDTH;
    ctx.strokeText(
      `${slice.percentage.toFixed(1)}${pieChartConfig.text.PERCENTAGE_SUFFIX}`,
      labelX,
      labelY,
    );
    ctx.fillText(
      `${slice.percentage.toFixed(1)}${pieChartConfig.text.PERCENTAGE_SUFFIX}`,
      labelX,
      labelY,
    );
  }

  /**
   * Draw the legend
   */
  private drawLegend(ctx: CanvasRenderingContext2D, slices: PieSlice[]): void {
    ctx.font = `${pieChartConfig.layout.FONT_SIZE}px ${pieChartConfig.text.FONT_FAMILY}`;
    ctx.textAlign = "left";

    for (const [index, slice] of slices.entries()) {
      const y = pieChartConfig.layout.LEGEND_Y + index * pieChartConfig.layout.LEGEND_ITEM_HEIGHT;

      // Draw color box
      ctx.fillStyle = slice.color;
      ctx.fillRect(
        pieChartConfig.layout.LEGEND_X,
        y - pieChartConfig.numeric.LEGEND_BOX_OFFSET,
        pieChartConfig.numeric.LEGEND_BOX_SIZE,
        pieChartConfig.numeric.LEGEND_BOX_SIZE,
      );

      // Draw border around color box
      ctx.strokeStyle = pieChartConfig.colors.LEGEND_BORDER;
      ctx.lineWidth = pieChartConfig.numeric.LEGEND_BORDER_WIDTH;
      ctx.strokeRect(
        pieChartConfig.layout.LEGEND_X,
        y - pieChartConfig.numeric.LEGEND_BOX_OFFSET,
        pieChartConfig.numeric.LEGEND_BOX_SIZE,
        pieChartConfig.numeric.LEGEND_BOX_SIZE,
      );

      // Draw label and count
      ctx.fillStyle = pieChartConfig.colors.TEXT;
      const labelText = `${slice.label}${pieChartConfig.text.FILES_PREFIX}${slice.value}${pieChartConfig.text.FILES_SUFFIX}`;
      ctx.fillText(
        labelText,
        pieChartConfig.layout.LEGEND_X + pieChartConfig.numeric.LEGEND_TEXT_OFFSET,
        y,
      );
    }
  }

  /**
   * Generate an empty chart when no data is available
   */
  private async generateEmptyChart(outputDir: string, filename: string): Promise<string> {
    // Minimal canvas for empty message
    const canvas = createCanvas(
      pieChartConfig.numeric.EMPTY_CANVAS_WIDTH,
      pieChartConfig.numeric.EMPTY_CANVAS_HEIGHT,
    );
    const ctx = canvas.getContext("2d");

    // Draw "No data" message
    ctx.font = `${pieChartConfig.layout.FONT_SIZE + 2}px ${pieChartConfig.text.FONT_FAMILY}`;
    ctx.fillStyle = pieChartConfig.colors.NO_DATA_TEXT;
    ctx.textAlign = "center";
    ctx.fillText(
      pieChartConfig.text.NO_DATA_MESSAGE,
      pieChartConfig.numeric.EMPTY_CANVAS_WIDTH / 2,
      pieChartConfig.numeric.EMPTY_CANVAS_HEIGHT / 2,
    );

    // Save to file
    const filepath = path.join(outputDir, filename);
    const buffer = canvas.toBuffer(pieChartConfig.file.FORMAT);
    await writeBinaryFile(filepath, buffer);
    return filename;
  }
}
