import { injectable } from "tsyringe";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";
import fs from "fs";
import type { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";

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
  // Layout dimensions
  private readonly PIE_RADIUS = 275;
  private readonly PIE_CENTER_X = 300;
  private readonly PIE_CENTER_Y = 313;
  private readonly LEGEND_X = 650;
  private readonly LEGEND_Y = 38;
  private readonly LEGEND_ITEM_HEIGHT = 31;
  private readonly FONT_SIZE = 18;
  private readonly CANVAS_PADDING = 25;

  // Predefined color palette for pie slices
  private readonly SLICE_COLORS = [
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
  ];

  // Colors for drawing elements
  private readonly COLORS = {
    SLICE_BORDER: "#ffffff",
    TEXT_STROKE: "#000000",
    TEXT: "#333333", 
    LEGEND_BORDER: "#cccccc",
    NO_DATA_TEXT: "#666666",
  } as const;

  // Text constants
  private readonly TEXT = {
    FONT_FAMILY: "Arial",
    FONT_WEIGHT_BOLD: "bold ",
    PERCENTAGE_SUFFIX: "%",
    FILES_SUFFIX: " files)",
    FILES_PREFIX: " (",
    NO_DATA_MESSAGE: "No file types data available",
  } as const;

  // Dynamic color generation constants
  private readonly DYNAMIC_COLOR = {
    GOLDEN_ANGLE: 137.5,
    SATURATION: 65,
    LIGHTNESS: 50,
    HSL_PREFIX: "hsl(",
    HSL_SEPARATOR: ", ",
    HSL_SUFFIX: "%)",
  } as const;

  // File constants
  private readonly FILE = {
    FORMAT: "image/png" as const,
    DEFAULT_FILENAME: "file-types-pie-chart.png",
  } as const;

  // Numeric constants
  private readonly NUMERIC = {
    PERCENTAGE_THRESHOLD: 3, // Minimum percentage to show label on slice
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
  } as const;

  /**
   * Generate a pie chart PNG for file types data
   */
  async generateFileTypesPieChart(
    fileTypesData: ProjectedFileTypesCountAndLines[],
    outputDir: string,
    filename = this.FILE.DEFAULT_FILENAME,
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
    const buffer = canvas.toBuffer(this.FILE.FORMAT);
    await fs.promises.writeFile(filepath, buffer);
    return filename;
  }

  /**
   * Generate color for pie slice - uses predefined colors first, then generates unique HSL colors
   */
  private generateColor(index: number): string {
    if (index < this.SLICE_COLORS.length) {
      // Use predefined color palette for first 15 slices
      return this.SLICE_COLORS[index];
    }
    
    // Generate dynamic colors using HSL for additional slices
    // Use golden angle for good color distribution
    const hue = ((index - this.SLICE_COLORS.length) * this.DYNAMIC_COLOR.GOLDEN_ANGLE) % 360;
    
    return `${this.DYNAMIC_COLOR.HSL_PREFIX}${hue}${this.DYNAMIC_COLOR.HSL_SEPARATOR}${this.DYNAMIC_COLOR.SATURATION}${this.TEXT.PERCENTAGE_SUFFIX}${this.DYNAMIC_COLOR.HSL_SEPARATOR}${this.DYNAMIC_COLOR.LIGHTNESS}${this.DYNAMIC_COLOR.HSL_SUFFIX}`;
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
    const pieWidth = this.PIE_CENTER_X + this.PIE_RADIUS + this.CANVAS_PADDING;

    // Calculate legend width (approximate based on longest text)
    const maxLabelLength = Math.max(...slices.map((s) => s.label.length));
    const estimatedLegendWidth = Math.max(this.NUMERIC.MIN_LEGEND_WIDTH, maxLabelLength * this.NUMERIC.TEXT_WIDTH_ESTIMATE + this.NUMERIC.LEGEND_WIDTH_PADDING);
    const totalWidth = Math.max(
      pieWidth,
      this.LEGEND_X + estimatedLegendWidth + this.CANVAS_PADDING,
    );

    // Calculate minimum height needed: pie circle or legend height
    const pieHeight = this.PIE_CENTER_Y + this.PIE_RADIUS + this.CANVAS_PADDING;
    const legendHeight =
      this.LEGEND_Y + slices.length * this.LEGEND_ITEM_HEIGHT + this.CANVAS_PADDING;
    const totalHeight = Math.max(pieHeight, legendHeight);
    return {
      width: Math.min(totalWidth, this.NUMERIC.MAX_CANVAS_WIDTH), // Cap at reasonable maximum
      height: Math.min(totalHeight, this.NUMERIC.MAX_CANVAS_HEIGHT),
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
      ctx.moveTo(this.PIE_CENTER_X, this.PIE_CENTER_Y);
      ctx.arc(
        this.PIE_CENTER_X,
        this.PIE_CENTER_Y,
        this.PIE_RADIUS,
        slice.startAngle,
        slice.endAngle,
      );
      ctx.closePath();
      ctx.fill();

      // Draw slice border
      ctx.strokeStyle = this.COLORS.SLICE_BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw percentage label on slice (if slice is large enough)
      if (slice.percentage >= this.NUMERIC.PERCENTAGE_THRESHOLD) {
        this.drawSliceLabel(ctx, slice);
      }
    }
  }

  /**
   * Draw percentage label on a pie slice
   */
  private drawSliceLabel(ctx: CanvasRenderingContext2D, slice: PieSlice): void {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const labelRadius = this.PIE_RADIUS * this.NUMERIC.LABEL_RADIUS_FACTOR;
    const labelX = this.PIE_CENTER_X + Math.cos(midAngle) * labelRadius;
    const labelY = this.PIE_CENTER_Y + Math.sin(midAngle) * labelRadius;
    ctx.font = `${this.TEXT.FONT_WEIGHT_BOLD}${this.FONT_SIZE + 2}px ${this.TEXT.FONT_FAMILY}`;
    ctx.fillStyle = this.COLORS.SLICE_BORDER;
    ctx.textAlign = "center";
    ctx.strokeStyle = this.COLORS.TEXT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeText(`${slice.percentage.toFixed(1)}${this.TEXT.PERCENTAGE_SUFFIX}`, labelX, labelY);
    ctx.fillText(`${slice.percentage.toFixed(1)}${this.TEXT.PERCENTAGE_SUFFIX}`, labelX, labelY);
  }

  /**
   * Draw the legend
   */
  private drawLegend(ctx: CanvasRenderingContext2D, slices: PieSlice[]): void {
    ctx.font = `${this.FONT_SIZE}px ${this.TEXT.FONT_FAMILY}`;
    ctx.textAlign = "left";

    slices.forEach((slice, index) => {
      const y = this.LEGEND_Y + index * this.LEGEND_ITEM_HEIGHT;

      // Draw color box
      ctx.fillStyle = slice.color;
      ctx.fillRect(this.LEGEND_X, y - this.NUMERIC.LEGEND_BOX_OFFSET, this.NUMERIC.LEGEND_BOX_SIZE, this.NUMERIC.LEGEND_BOX_SIZE);

      // Draw border around color box
      ctx.strokeStyle = this.COLORS.LEGEND_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.LEGEND_X, y - this.NUMERIC.LEGEND_BOX_OFFSET, this.NUMERIC.LEGEND_BOX_SIZE, this.NUMERIC.LEGEND_BOX_SIZE);

      // Draw label and count
      ctx.fillStyle = this.COLORS.TEXT;
      const labelText = `${slice.label}${this.TEXT.FILES_PREFIX}${slice.value}${this.TEXT.FILES_SUFFIX}`;
      ctx.fillText(labelText, this.LEGEND_X + this.NUMERIC.LEGEND_TEXT_OFFSET, y);
    });
  }

  /**
   * Generate an empty chart when no data is available
   */
  private async generateEmptyChart(outputDir: string, filename: string): Promise<string> {
    // Minimal canvas for empty message
    const canvas = createCanvas(this.NUMERIC.EMPTY_CANVAS_WIDTH, this.NUMERIC.EMPTY_CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // Draw "No data" message
    ctx.font = `${this.FONT_SIZE + 2}px ${this.TEXT.FONT_FAMILY}`;
    ctx.fillStyle = this.COLORS.NO_DATA_TEXT;
    ctx.textAlign = "center";
    ctx.fillText(this.TEXT.NO_DATA_MESSAGE, this.NUMERIC.EMPTY_CANVAS_WIDTH / 2, this.NUMERIC.EMPTY_CANVAS_HEIGHT / 2);

    // Save to file
    const filepath = path.join(outputDir, filename);
    const buffer = canvas.toBuffer(this.FILE.FORMAT);
    await fs.promises.writeFile(filepath, buffer);
    return filename;
  }
}
