/**
 * Tests for pie chart calculation utilities.
 */

import {
  calculatePieChartData,
  describeArc,
  getSliceColor,
  type FileTypeData,
} from "../../../../../../src/app/components/reporting/sections/file-types/pie-chart-calculator";
import { visualizationConfig } from "../../../../../../src/app/components/reporting/generators/visualization.config";

describe("pie-chart-calculator", () => {
  describe("getSliceColor", () => {
    it("should return colors from the predefined palette for initial indices", () => {
      const colors = visualizationConfig.pieChart.COLORS;
      for (let i = 0; i < colors.length; i++) {
        expect(getSliceColor(i)).toBe(colors[i]);
      }
    });

    it("should generate HSL colors for indices beyond the palette", () => {
      const paletteSize = visualizationConfig.pieChart.COLORS.length;
      const color = getSliceColor(paletteSize);
      expect(color).toMatch(/^hsl\(\d+(\.\d+)?, 65%, 50%\)$/);
    });

    it("should generate different colors for consecutive indices beyond palette", () => {
      const paletteSize = visualizationConfig.pieChart.COLORS.length;
      const color1 = getSliceColor(paletteSize);
      const color2 = getSliceColor(paletteSize + 1);
      expect(color1).not.toBe(color2);
    });
  });

  describe("describeArc", () => {
    it("should return valid SVG path for a quarter circle", () => {
      const path = describeArc(100, 100, 50, 0, Math.PI / 2);
      expect(path).toContain("M 100 100"); // Start at center
      expect(path).toContain("L 150 100"); // Line to start point
      expect(path).toContain("A 50 50"); // Arc with radius
      expect(path).toContain("Z"); // Close path
    });

    it("should set large arc flag for angles > π", () => {
      // Arc greater than half circle
      const path = describeArc(100, 100, 50, 0, Math.PI * 1.5);
      // Large arc flag should be 1 for angles > π
      expect(path).toMatch(/A 50 50 0 1 1/);
    });

    it("should not set large arc flag for angles < π", () => {
      // Arc less than half circle
      const path = describeArc(100, 100, 50, 0, Math.PI / 2);
      // Large arc flag should be 0 for angles < π
      expect(path).toMatch(/A 50 50 0 0 1/);
    });
  });

  describe("calculatePieChartData", () => {
    it("should return empty slices array for empty input", () => {
      const result = calculatePieChartData([]);
      expect(result.totalFiles).toBe(0);
      expect(result.slices).toHaveLength(0);
    });

    it("should calculate correct total files", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
        { fileType: "ts", files: 20, lines: 200 },
        { fileType: "css", files: 5, lines: 50 },
      ];
      const result = calculatePieChartData(data);
      expect(result.totalFiles).toBe(35);
    });

    it("should calculate correct percentages", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 50, lines: 500 },
        { fileType: "ts", files: 50, lines: 500 },
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].percentage).toBe(50);
      expect(result.slices[1].percentage).toBe(50);
    });

    it("should assign colors to each slice", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
        { fileType: "ts", files: 20, lines: 200 },
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].color).toBe(visualizationConfig.pieChart.COLORS[0]);
      expect(result.slices[1].color).toBe(visualizationConfig.pieChart.COLORS[1]);
    });

    it("should generate path data for each slice", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].pathData).toContain("M");
      expect(result.slices[0].pathData).toContain("A");
      expect(result.slices[0].pathData).toContain("Z");
    });

    it("should show label for slices above threshold", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 97, lines: 970 }, // 97%
        { fileType: "ts", files: 3, lines: 30 }, // 3% - at threshold
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].showLabel).toBe(true);
      expect(result.slices[1].showLabel).toBe(true);
    });

    it("should hide label for slices below threshold", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 98, lines: 980 }, // 98%
        { fileType: "ts", files: 2, lines: 20 }, // 2% - below threshold
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].showLabel).toBe(true);
      expect(result.slices[1].showLabel).toBe(false);
    });

    it("should use 'unknown' for empty file type labels", () => {
      const data: FileTypeData[] = [
        { fileType: "", files: 10, lines: 100 },
      ];
      const result = calculatePieChartData(data);
      expect(result.slices[0].label).toBe("unknown");
    });

    it("should include config values for template rendering", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
      ];
      const result = calculatePieChartData(data);
      expect(result.config.centerX).toBe(visualizationConfig.pieChart.CENTER_X);
      expect(result.config.centerY).toBe(visualizationConfig.pieChart.CENTER_Y);
      expect(result.config.legendX).toBe(visualizationConfig.pieChart.LEGEND_X);
      expect(result.config.legendY).toBe(visualizationConfig.pieChart.LEGEND_Y);
    });

    it("should calculate label positions at midpoint of slice", () => {
      // Two equal slices - first slice goes from -π/2 to π/2 (top-right quadrant)
      const data: FileTypeData[] = [
        { fileType: "js", files: 50, lines: 500 },
        { fileType: "ts", files: 50, lines: 500 },
      ];
      const result = calculatePieChartData(data);
      // First slice mid-angle is 0 (3 o'clock position), so labelX should be right of center
      expect(result.slices[0].labelX).toBeGreaterThan(visualizationConfig.pieChart.CENTER_X);
      // Second slice mid-angle is π (9 o'clock position), so labelX should be left of center
      expect(result.slices[1].labelX).toBeLessThan(visualizationConfig.pieChart.CENTER_X);
    });

    it("should calculate SVG height based on content", () => {
      const smallData: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
      ];
      const largeData: FileTypeData[] = Array(30)
        .fill(null)
        .map((_, i) => ({ fileType: `type${i}`, files: 10, lines: 100 }));

      const smallResult = calculatePieChartData(smallData);
      const largeResult = calculatePieChartData(largeData);

      // More legend items should require more height
      expect(largeResult.svgHeight).toBeGreaterThan(smallResult.svgHeight);
    });

    it("should set SVG width from config", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 10, lines: 100 },
      ];
      const result = calculatePieChartData(data);
      expect(result.svgWidth).toBe(visualizationConfig.pieChart.SVG_WIDTH);
    });

    it("should handle zero total files gracefully", () => {
      const data: FileTypeData[] = [
        { fileType: "js", files: 0, lines: 0 },
        { fileType: "ts", files: 0, lines: 0 },
      ];
      const result = calculatePieChartData(data);
      expect(result.totalFiles).toBe(0);
      expect(result.slices[0].percentage).toBe(0);
      expect(result.slices[1].percentage).toBe(0);
    });
  });
});

