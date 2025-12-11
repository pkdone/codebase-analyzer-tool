import "reflect-metadata";
import { CanvasDrawer } from "../../../../../src/components/reporting/generators/png/canvas-drawer";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import { dependencyTreePngConfig } from "../../../../../src/components/reporting/generators/dependency-tree-png.config";

describe("CanvasDrawer", () => {
  let drawer: CanvasDrawer;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    drawer = new CanvasDrawer();
    const canvas = createCanvas(100, 100);
    ctx = canvas.getContext("2d");
  });

  describe("drawRectangle", () => {
    it("should draw a rectangle with fill and stroke", () => {
      const fillRectSpy = jest.spyOn(ctx, "fillRect");
      const strokeRectSpy = jest.spyOn(ctx, "strokeRect");

      drawer.drawRectangle(ctx, 10, 20, 30, 40, "#ffffff", "#000000", 2);

      expect(fillRectSpy).toHaveBeenCalledWith(10, 20, 30, 40);
      expect(strokeRectSpy).toHaveBeenCalledWith(10, 20, 30, 40);
      expect(ctx.fillStyle).toBe("#ffffff");
      expect(ctx.strokeStyle).toBe("#000000");
      expect(ctx.lineWidth).toBe(2);
    });
  });

  describe("drawLine", () => {
    it("should draw a line between two points", () => {
      const beginPathSpy = jest.spyOn(ctx, "beginPath");
      const moveToSpy = jest.spyOn(ctx, "moveTo");
      const lineToSpy = jest.spyOn(ctx, "lineTo");
      const strokeSpy = jest.spyOn(ctx, "stroke");

      drawer.drawLine(ctx, 10, 20, 30, 40, "#000000", 1);

      expect(beginPathSpy).toHaveBeenCalled();
      expect(moveToSpy).toHaveBeenCalledWith(10, 20);
      expect(lineToSpy).toHaveBeenCalledWith(30, 40);
      expect(strokeSpy).toHaveBeenCalled();
      expect(ctx.strokeStyle).toBe("#000000");
      expect(ctx.lineWidth).toBe(1);
    });
  });

  describe("drawText", () => {
    it("should draw text with left alignment", () => {
      const fillTextSpy = jest.spyOn(ctx, "fillText");

      drawer.drawText(ctx, "Test Text", 10, 20, "12px Arial", "#000000", "left");

      expect(fillTextSpy).toHaveBeenCalledWith("Test Text", 10, 20);
      expect(ctx.font).toBe("12px Arial");
      expect(ctx.fillStyle).toBe("#000000");
      expect(ctx.textAlign).toBe("left");
    });

    it("should draw text with center alignment", () => {
      drawer.drawText(ctx, "Test Text", 50, 20, "12px Arial", "#000000", "center");

      expect(ctx.textAlign).toBe("center");
    });

    it("should draw text with right alignment", () => {
      drawer.drawText(ctx, "Test Text", 90, 20, "12px Arial", "#000000", "right");

      expect(ctx.textAlign).toBe("right");
    });
  });

  describe("drawArrow", () => {
    it("should draw an arrow head", () => {
      const beginPathSpy = jest.spyOn(ctx, "beginPath");
      const moveToSpy = jest.spyOn(ctx, "moveTo");
      const lineToSpy = jest.spyOn(ctx, "lineTo");
      const closePathSpy = jest.spyOn(ctx, "closePath");
      const fillSpy = jest.spyOn(ctx, "fill");

      drawer.drawArrow(ctx, 10, 20, 30, 40, "#000000");

      expect(beginPathSpy).toHaveBeenCalled();
      expect(moveToSpy).toHaveBeenCalledWith(30, 40);
      expect(lineToSpy).toHaveBeenCalledTimes(2);
      expect(closePathSpy).toHaveBeenCalled();
      expect(fillSpy).toHaveBeenCalled();
      expect(ctx.fillStyle).toBe("#000000");
    });
  });

  describe("drawConnectionLine", () => {
    it("should draw connection line when target is within bounds", () => {
      const fromNode = { x: 10, y: 10, width: 20, height: 20 };
      const toNode = { x: 50, y: 50, width: 20, height: 20 };

      const drawLineSpy = jest.spyOn(drawer, "drawLine" as any);
      const drawArrowSpy = jest.spyOn(drawer, "drawArrow" as any);

      drawer.drawConnectionLine(ctx, fromNode, toNode, "#000000");

      expect(drawLineSpy).toHaveBeenCalled();
      expect(drawArrowSpy).toHaveBeenCalled();
    });

    it("should not draw connection line when target is out of bounds", () => {
      const fromNode = { x: 10, y: 10, width: 20, height: 20 };
      const toNode = {
        x: dependencyTreePngConfig.canvas.MAX_WIDTH + 10,
        y: 50,
        width: 20,
        height: 20,
      };

      const drawLineSpy = jest.spyOn(drawer, "drawLine" as any);
      const drawArrowSpy = jest.spyOn(drawer, "drawArrow" as any);

      drawer.drawConnectionLine(ctx, fromNode, toNode, "#000000");

      expect(drawLineSpy).not.toHaveBeenCalled();
      expect(drawArrowSpy).not.toHaveBeenCalled();
    });

    it("should apply yOffset to connection line", () => {
      const fromNode = { x: 10, y: 10, width: 20, height: 20 };
      const toNode = { x: 50, y: 50, width: 20, height: 20 };

      const drawLineSpy = jest.spyOn(drawer, "drawLine" as any);

      drawer.drawConnectionLine(ctx, fromNode, toNode, "#000000", 5);

      expect(drawLineSpy).toHaveBeenCalled();
      const callArgs = drawLineSpy.mock.calls[0];
      // Verify yOffset is applied (fromY should be adjusted)
      expect(callArgs[2]).toBeGreaterThan(20); // fromY with offset
    });
  });
});
