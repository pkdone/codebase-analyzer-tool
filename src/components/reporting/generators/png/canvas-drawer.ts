import { CanvasRenderingContext2D } from "canvas";
import { dependencyTreePngConfig } from "../dependency-tree-png.config";

/**
 * Utility class for low-level canvas drawing operations.
 * Encapsulates primitive drawing methods to separate rendering concerns from layout logic.
 */
export class CanvasDrawer {
  /**
   * Draw a rectangle with border
   */
  drawRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string,
    strokeColor: string,
    lineWidth: number,
  ): void {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a line between two points
   */
  drawLine(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    lineWidth: number,
  ): void {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }

  /**
   * Draw text on the canvas
   */
  drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: "left" | "center" | "right" = "left",
  ): void {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  /**
   * Draw an arrow head at the end of a line
   */
  drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ): void {
    const arrowLength = dependencyTreePngConfig.numeric.ARROW_LENGTH;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    const arrowX1 =
      toX - arrowLength * Math.cos(angle - dependencyTreePngConfig.numeric.ARROW_ANGLE_RADIANS);
    const arrowY1 =
      toY - arrowLength * Math.sin(angle - dependencyTreePngConfig.numeric.ARROW_ANGLE_RADIANS);
    const arrowX2 =
      toX - arrowLength * Math.cos(angle + dependencyTreePngConfig.numeric.ARROW_ANGLE_RADIANS);
    const arrowY2 =
      toY - arrowLength * Math.sin(angle + dependencyTreePngConfig.numeric.ARROW_ANGLE_RADIANS);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(arrowX1, arrowY1);
    ctx.lineTo(arrowX2, arrowY2);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw a connection line with arrow between two nodes using smart connection points.
   * This method handles the calculation of connection points and drawing of the line with arrow.
   * Only draws if the target node is within canvas bounds.
   */
  drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    fromNode: { x: number; y: number; width: number; height: number },
    toNode: { x: number; y: number; width: number; height: number },
    color: string,
    yOffset = 0,
  ): void {
    // Only draw if target node is within canvas bounds
    if (
      toNode.x >= 0 &&
      toNode.y >= 0 &&
      toNode.x + toNode.width <= dependencyTreePngConfig.canvas.MAX_WIDTH &&
      toNode.y + toNode.height <= dependencyTreePngConfig.canvas.MAX_HEIGHT
    ) {
      const { fromX, fromY, toX, toY } = this.calculateConnectionPoints(fromNode, toNode);
      const adjustedFromY = fromY + yOffset;

      this.drawLine(
        ctx,
        fromX,
        adjustedFromY,
        toX,
        toY,
        color,
        dependencyTreePngConfig.numeric.CONNECTION_WIDTH,
      );
      this.drawArrow(ctx, fromX, adjustedFromY, toX, toY, color);
    }
  }

  /**
   * Calculate smart connection points between two nodes
   */
  private calculateConnectionPoints(
    fromNode: { x: number; y: number; width: number; height: number },
    toNode: { x: number; y: number; width: number; height: number },
  ): { fromX: number; fromY: number; toX: number; toY: number } {
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromCenterY = fromNode.y + fromNode.height / 2;
    const toCenterX = toNode.x + toNode.width / 2;
    const toCenterY = toNode.y + toNode.height / 2;

    // Determine relative position
    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;
    let fromX: number, fromY: number, toX: number, toY: number;

    // Determine best connection points - DOWNWARD connections take precedence
    if (deltaY > 0) {
      // Target is below - ALWAYS use vertical connection for downward lines
      fromX = fromCenterX;
      fromY = fromNode.y + fromNode.height;
      toX = toCenterX;
      toY = toNode.y;
    } else if (deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      // Target is above and primarily vertical
      fromX = fromCenterX;
      fromY = fromNode.y;
      toX = toCenterX;
      toY = toNode.y + toNode.height;
    } else if (deltaX > 0) {
      // Primarily horizontal connection (or upward with significant horizontal component)
      // Target is to the right - connect from right of source to left of target
      fromX = fromNode.x + fromNode.width;
      fromY = fromCenterY;
      toX = toNode.x;
      toY = toCenterY;
    } else {
      // Target is to the left - connect from left of source to right of target
      fromX = fromNode.x;
      fromY = fromCenterY;
      toX = toNode.x + toNode.width;
      toY = toCenterY;
    }

    return { fromX, fromY, toX, toY };
  }
}
