import { dependencyTreePngConfig } from "../../src/components/reporting/dependency-tree-png.config";

describe("dependencyTreePngConfig", () => {
  it("should have all required layout properties", () => {
    expect(dependencyTreePngConfig.layout).toBeDefined();
    expect(dependencyTreePngConfig.layout.NODE_WIDTH).toBe(400);
    expect(dependencyTreePngConfig.layout.NODE_HEIGHT).toBe(45);
    expect(dependencyTreePngConfig.layout.FONT_SIZE).toBe(12);
  });

  it("should have all required compactLayout properties", () => {
    expect(dependencyTreePngConfig.compactLayout).toBeDefined();
    expect(dependencyTreePngConfig.compactLayout.NODE_WIDTH).toBe(350);
    expect(dependencyTreePngConfig.compactLayout.NODE_HEIGHT).toBe(30);
    expect(dependencyTreePngConfig.compactLayout.FONT_SIZE).toBe(10);
  });

  it("should have canvas constraints", () => {
    expect(dependencyTreePngConfig.canvas).toBeDefined();
    expect(dependencyTreePngConfig.canvas.MAX_WIDTH).toBe(8000);
    expect(dependencyTreePngConfig.canvas.MAX_HEIGHT).toBe(8000);
    expect(dependencyTreePngConfig.canvas.MIN_WIDTH).toBe(800);
    expect(dependencyTreePngConfig.canvas.MIN_HEIGHT).toBe(600);
    expect(dependencyTreePngConfig.canvas.COMPLEX_TREE_THRESHOLD).toBe(50);
  });

  it("should have color configuration", () => {
    expect(dependencyTreePngConfig.colors).toBeDefined();
    expect(dependencyTreePngConfig.colors.WHITE).toBe("#ffffff");
    expect(dependencyTreePngConfig.colors.ROOT_BORDER).toBe("#2196F3");
  });

  it("should have text configuration", () => {
    expect(dependencyTreePngConfig.text).toBeDefined();
    expect(dependencyTreePngConfig.text.FONT_FAMILY).toBe("Arial");
    expect(dependencyTreePngConfig.text.LEVEL_PREFIX).toBe("L");
  });

  it("should have file configuration", () => {
    expect(dependencyTreePngConfig.file).toBeDefined();
    expect(dependencyTreePngConfig.file.FORMAT).toBe("image/png");
    expect(dependencyTreePngConfig.file.EXTENSION).toBe(".png");
  });

  it("should have numeric constants", () => {
    expect(dependencyTreePngConfig.numeric).toBeDefined();
    expect(dependencyTreePngConfig.numeric.ARROW_LENGTH).toBe(10);
    expect(dependencyTreePngConfig.numeric.CONNECTION_WIDTH).toBe(2);
  });
});
