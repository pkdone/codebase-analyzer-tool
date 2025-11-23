import { pieChartConfig } from "../../../../src/components/reporting/generators/pie-chart.config";

describe("pieChartConfig", () => {
  it("should have all required layout properties", () => {
    expect(pieChartConfig.layout).toBeDefined();
    expect(pieChartConfig.layout.PIE_RADIUS).toBe(275);
    expect(pieChartConfig.layout.PIE_CENTER_X).toBe(300);
    expect(pieChartConfig.layout.PIE_CENTER_Y).toBe(313);
    expect(pieChartConfig.layout.FONT_SIZE).toBe(18);
  });

  it("should have predefined slice colors", () => {
    expect(pieChartConfig.sliceColors).toBeDefined();
    expect(Array.isArray(pieChartConfig.sliceColors)).toBe(true);
    expect(pieChartConfig.sliceColors.length).toBe(15);
    expect(pieChartConfig.sliceColors[0]).toBe("#2196F3"); // Blue
  });

  it("should have color configuration", () => {
    expect(pieChartConfig.colors).toBeDefined();
    expect(pieChartConfig.colors.SLICE_BORDER).toBe("#ffffff");
    expect(pieChartConfig.colors.TEXT).toBe("#333333");
  });

  it("should have text configuration", () => {
    expect(pieChartConfig.text).toBeDefined();
    expect(pieChartConfig.text.FONT_FAMILY).toBe("Arial");
    expect(pieChartConfig.text.PERCENTAGE_SUFFIX).toBe("%");
    expect(pieChartConfig.text.NO_DATA_MESSAGE).toBe("No file types data available");
  });

  it("should have dynamic color generation settings", () => {
    expect(pieChartConfig.dynamicColor).toBeDefined();
    expect(pieChartConfig.dynamicColor.GOLDEN_ANGLE).toBe(137.5);
    expect(pieChartConfig.dynamicColor.SATURATION).toBe(65);
  });

  it("should have file configuration", () => {
    expect(pieChartConfig.file).toBeDefined();
    expect(pieChartConfig.file.FORMAT).toBe("image/png");
    expect(pieChartConfig.file.DEFAULT_FILENAME).toBe("file-types-pie-chart.png");
  });

  it("should have numeric constants", () => {
    expect(pieChartConfig.numeric).toBeDefined();
    expect(pieChartConfig.numeric.PERCENTAGE_THRESHOLD).toBe(3);
    expect(pieChartConfig.numeric.MAX_CANVAS_WIDTH).toBe(1200);
    expect(pieChartConfig.numeric.MAX_CANVAS_HEIGHT).toBe(700);
  });
});
