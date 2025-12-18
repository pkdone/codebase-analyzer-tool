import { injectable } from "tsyringe";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";
import { writeBinaryFile } from "../../../../../common/fs/file-operations";
import type { HierarchicalJavaClassDependency } from "../../../../repositories/sources/sources.model";
import { logOneLineWarning } from "../../../../../common/utils/logging";
import { dependencyTreePngConfig } from "../dependency-tree-png.config";

interface HierarchicalTreeNode {
  classpath: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: HierarchicalTreeNode[];
  isReference?: boolean; // True if this is a reference to an existing node
  referenceTo?: HierarchicalTreeNode; // Points to the original node
}

interface LayoutDimensions {
  nodeWidth: number;
  nodeHeight: number;
  levelHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  fontSize: number;
  canvasPadding: number;
}

/**
 * Generates PNG images showing dependency trees for Java classes using HTML5 Canvas API.
 * Creates visual representations of class hierarchies and their dependency relationships.
 */
@injectable()
export class DependencyTreePngGenerator {
  /**
   * Generate a PNG file showing the hierarchical dependency tree for a specific Java class
   */
  async generateHierarchicalDependencyTreePng(
    classpath: string,
    hierarchicalDependencies: readonly HierarchicalJavaClassDependency[],
    outputDir: string,
  ): Promise<string> {
    try {
      // Create a safe filename from the classpath
      const filename = this.createSafeFilename(classpath);
      const filepath = path.join(outputDir, `${filename}.png`);

      // Check if dependency tree is complex and determine layout mode
      const totalNodes = this.countTotalNodes(hierarchicalDependencies);
      const useCompactMode = totalNodes > dependencyTreePngConfig.canvas.COMPLEX_TREE_THRESHOLD;
      const layout = this.getLayoutDimensions(useCompactMode);

      // Track nodes to avoid duplicates
      const nodeRegistry = new Map<string, HierarchicalTreeNode>();

      // Convert hierarchical dependencies to positioned tree nodes
      const rootNode: HierarchicalTreeNode = {
        classpath: classpath,
        level: 0,
        x: 0,
        y: 0,
        width: layout.nodeWidth,
        height: layout.nodeHeight,
        children: [],
      };

      // Register root node and build children with proper level assignment
      nodeRegistry.set(classpath, rootNode);

      // Build tree using original level information from flat data
      rootNode.children = this.convertHierarchicalToTreeNodes(
        hierarchicalDependencies,
        layout,
        nodeRegistry,
      );

      // Calculate positions for all nodes
      this.calculateHierarchicalPositions(rootNode, layout);

      // Calculate canvas dimensions
      const { width, height } = this.calculateHierarchicalCanvasDimensions(rootNode, layout);

      // Validate dimensions before creating canvas
      if (
        width <= 0 ||
        height <= 0 ||
        width > dependencyTreePngConfig.canvas.MAX_WIDTH ||
        height > dependencyTreePngConfig.canvas.MAX_HEIGHT
      ) {
        throw new Error(
          `Canvas dimensions ${width}x${height} exceed limits even with compact layout`,
        );
      }

      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Draw the hierarchical dependency tree
      this.drawHierarchicalDependencyTree(ctx, classpath, rootNode, width, height, layout);

      // Save to file
      const buffer = canvas.toBuffer(dependencyTreePngConfig.file.FORMAT);
      await writeBinaryFile(filepath, buffer);
      return filename + dependencyTreePngConfig.file.EXTENSION;
    } catch (error: unknown) {
      logOneLineWarning(`Failed to generate dependency tree for ${classpath}: ${String(error)}`);
      throw error; // Re-throw since we removed the fallback to simplified PNG
    }
  }

  /**
   * Get layout dimensions based on complexity mode
   */
  private getLayoutDimensions(useCompactMode: boolean): LayoutDimensions {
    return useCompactMode
      ? {
          nodeWidth: dependencyTreePngConfig.compactLayout.NODE_WIDTH,
          nodeHeight: dependencyTreePngConfig.compactLayout.NODE_HEIGHT,
          levelHeight: dependencyTreePngConfig.compactLayout.LEVEL_HEIGHT,
          horizontalSpacing: dependencyTreePngConfig.compactLayout.HORIZONTAL_SPACING,
          verticalSpacing: dependencyTreePngConfig.compactLayout.VERTICAL_SPACING,
          fontSize: dependencyTreePngConfig.compactLayout.FONT_SIZE,
          canvasPadding: dependencyTreePngConfig.compactLayout.CANVAS_PADDING,
        }
      : {
          nodeWidth: dependencyTreePngConfig.layout.NODE_WIDTH,
          nodeHeight: dependencyTreePngConfig.layout.NODE_HEIGHT,
          levelHeight: dependencyTreePngConfig.layout.LEVEL_HEIGHT,
          horizontalSpacing: dependencyTreePngConfig.layout.HORIZONTAL_SPACING,
          verticalSpacing: dependencyTreePngConfig.layout.VERTICAL_SPACING,
          fontSize: dependencyTreePngConfig.layout.FONT_SIZE,
          canvasPadding: dependencyTreePngConfig.layout.CANVAS_PADDING,
        };
  }

  /**
   * Create a filesystem-safe filename from a Java classpath
   */
  private createSafeFilename(classpath: string): string {
    return classpath
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/(?:^_)|(?:_$)/g, "");
  }

  /**
   * Draw the title at the top of the canvas
   */
  private drawTitle(
    ctx: CanvasRenderingContext2D,
    mainClasspath: string,
    canvasWidth: number,
  ): void {
    const titleText = `${dependencyTreePngConfig.text.TITLE_PREFIX}${mainClasspath}`;
    const titleFont = `${dependencyTreePngConfig.text.FONT_WEIGHT_BOLD}${dependencyTreePngConfig.layout.FONT_SIZE + dependencyTreePngConfig.numeric.FONT_SIZE_TITLE_OFFSET}px ${dependencyTreePngConfig.text.FONT_FAMILY}`;
    this.drawText(
      ctx,
      titleText,
      canvasWidth / 2,
      dependencyTreePngConfig.numeric.TITLE_Y_POSITION,
      titleFont,
      dependencyTreePngConfig.colors.TEXT,
      "center",
    );
  }

  /**
   * Draw a single node (class box)
   */

  /**
   * Convert hierarchical dependencies to tree nodes using original levels, avoiding duplicates
   */
  private convertHierarchicalToTreeNodes(
    hierarchicalDeps: readonly HierarchicalJavaClassDependency[],
    layout: LayoutDimensions,
    nodeRegistry: Map<string, HierarchicalTreeNode>,
  ): HierarchicalTreeNode[] {
    return hierarchicalDeps.map((dep: HierarchicalJavaClassDependency): HierarchicalTreeNode => {
      // Check if this node already exists
      const existingNode = nodeRegistry.get(dep.namespace);
      // Use original level from flat data, defaulting to 1 if not provided
      const properLevel = dep.originalLevel ?? 1;

      if (existingNode) {
        // Create a reference node instead of a duplicate
        return {
          classpath: dep.namespace,
          level: properLevel,
          x: 0,
          y: 0,
          width: layout.nodeWidth,
          height: layout.nodeHeight,
          children: [],
          isReference: true,
          referenceTo: existingNode,
        };
      } else {
        // Create a new node with original level
        const newNode: HierarchicalTreeNode = {
          classpath: dep.namespace,
          level: properLevel,
          x: 0,
          y: 0,
          width: layout.nodeWidth,
          height: layout.nodeHeight,
          children: [],
        };

        // Register the node before processing children to handle circular references
        nodeRegistry.set(dep.namespace, newNode);

        // Process children
        newNode.children = dep.dependencies
          ? this.convertHierarchicalToTreeNodes(dep.dependencies, layout, nodeRegistry)
          : [];

        return newNode;
      }
    });
  }

  /**
   * Calculate positions for hierarchical tree nodes based on proper levels
   */
  private calculateHierarchicalPositions(
    rootNode: HierarchicalTreeNode,
    layout: LayoutDimensions,
  ): void {
    const nodesByLevel = new Map<number, HierarchicalTreeNode[]>();
    this.collectNodesByLevel(rootNode, nodesByLevel);
    this.positionNodesByLevel(nodesByLevel, layout);
  }

  /**
   * Collect all nodes organized by their proper levels
   */
  private collectNodesByLevel(
    node: HierarchicalTreeNode,
    nodesByLevel: Map<number, HierarchicalTreeNode[]>,
  ): void {
    // Only collect actual nodes, not references
    if (!node.isReference) {
      if (!nodesByLevel.has(node.level)) nodesByLevel.set(node.level, []);
      const nodes = nodesByLevel.get(node.level);
      if (nodes) nodes.push(node);

      for (const child of node.children) {
        this.collectNodesByLevel(child, nodesByLevel);
      }
    }
  }

  /**
   * Position nodes level by level
   */
  private positionNodesByLevel(
    nodesByLevel: Map<number, HierarchicalTreeNode[]>,
    layout: LayoutDimensions,
  ): void {
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

    for (const level of levels) {
      const nodes = nodesByLevel.get(level);
      if (!nodes) continue;
      const y = layout.canvasPadding + level * (layout.nodeHeight + layout.levelHeight);
      let currentX = layout.canvasPadding;

      // Position nodes horizontally
      for (const node of nodes) {
        node.x = currentX;
        node.y = y;
        currentX += layout.nodeWidth + layout.horizontalSpacing;
      }
    }
  }

  /**
   * Calculate canvas dimensions for hierarchical tree
   */
  private calculateHierarchicalCanvasDimensions(
    rootNode: HierarchicalTreeNode,
    layout: LayoutDimensions,
  ): { width: number; height: number } {
    // Collect all actual nodes by level to calculate proper dimensions
    const nodesByLevel = new Map<number, HierarchicalTreeNode[]>();
    this.collectNodesByLevel(rootNode, nodesByLevel);
    const { maxX, maxY } = this.getMaxDimensionsFromLevels(nodesByLevel);
    const calculatedWidth = Math.max(
      maxX + layout.canvasPadding,
      dependencyTreePngConfig.canvas.MIN_WIDTH,
    );
    const calculatedHeight = Math.max(
      maxY + layout.nodeHeight + layout.canvasPadding,
      dependencyTreePngConfig.canvas.MIN_HEIGHT,
    );
    const width = Math.min(calculatedWidth, dependencyTreePngConfig.canvas.MAX_WIDTH);
    const height = Math.min(calculatedHeight, dependencyTreePngConfig.canvas.MAX_HEIGHT);
    return { width, height };
  }

  /**
   * Get maximum dimensions from nodes organized by levels
   */
  private getMaxDimensionsFromLevels(nodesByLevel: Map<number, HierarchicalTreeNode[]>): {
    maxX: number;
    maxY: number;
  } {
    let maxX = 0;
    let maxY = 0;

    for (const nodes of nodesByLevel.values()) {
      for (const node of nodes) {
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      }
    }

    return { maxX, maxY };
  }

  /**
   * Draw the hierarchical dependency tree
   */
  private drawHierarchicalDependencyTree(
    ctx: CanvasRenderingContext2D,
    mainClasspath: string,
    rootNode: HierarchicalTreeNode,
    canvasWidth: number,
    canvasHeight: number,
    layout: LayoutDimensions,
  ): void {
    ctx.fillStyle = dependencyTreePngConfig.colors.WHITE;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    this.drawTitle(ctx, mainClasspath, canvasWidth);
    this.drawHierarchicalConnections(ctx, rootNode);
    this.drawHierarchicalNodes(ctx, rootNode, layout);
  }

  /**
   * Draw connections between hierarchical nodes
   */
  private drawHierarchicalConnections(
    ctx: CanvasRenderingContext2D,
    node: HierarchicalTreeNode,
  ): void {
    // Group connections by type to handle staggering
    const allTargets: HierarchicalTreeNode[] = [];

    for (const child of node.children) {
      if (child.isReference && child.referenceTo) {
        allTargets.push(child.referenceTo);
      } else {
        allTargets.push(child);
      }
    }

    // Draw connections with staggering for multiple horizontal arrows
    this.drawConnectionsWithStaggering(ctx, node, allTargets);

    // Recursively draw connections for actual children (not references)
    for (const child of node.children) {
      if (!child.isReference) {
        this.drawHierarchicalConnections(ctx, child);
      }
    }
  }

  /**
   * Draw connections with staggering for multiple horizontal arrows
   */
  private drawConnectionsWithStaggering(
    ctx: CanvasRenderingContext2D,
    sourceNode: HierarchicalTreeNode,
    targetNodes: HierarchicalTreeNode[],
  ): void {
    // Group targets by direction type
    const horizontalTargets: HierarchicalTreeNode[] = [];
    const verticalTargets: HierarchicalTreeNode[] = [];

    for (const target of targetNodes) {
      const deltaX = target.x + target.width / 2 - (sourceNode.x + sourceNode.width / 2);
      const deltaY = target.y + target.height / 2 - (sourceNode.y + sourceNode.height / 2);

      // Check if this is a horizontal connection (not downward)
      if (deltaY <= 0 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        horizontalTargets.push(target);
      } else {
        verticalTargets.push(target);
      }
    }

    // Draw vertical connections normally
    for (const target of verticalTargets) {
      this.drawConnectionLine(ctx, sourceNode, target, dependencyTreePngConfig.colors.CONNECTION);
    }

    // Draw horizontal connections with staggering
    if (horizontalTargets.length > 1) {
      const staggerOffset = dependencyTreePngConfig.numeric.STAGGER_OFFSET; // Pixels to offset each arrow
      const startOffset = -((horizontalTargets.length - 1) * staggerOffset) / 2;

      for (const [index, target] of horizontalTargets.entries()) {
        const yOffset = startOffset + index * staggerOffset;
        this.drawConnectionLine(
          ctx,
          sourceNode,
          target,
          dependencyTreePngConfig.colors.CONNECTION,
          yOffset,
        );
      }
    } else if (horizontalTargets.length === 1) {
      // Single horizontal connection - no staggering needed
      this.drawConnectionLine(
        ctx,
        sourceNode,
        horizontalTargets[0],
        dependencyTreePngConfig.colors.CONNECTION,
      );
    }
  }

  /**
   * Draw all hierarchical nodes
   */
  private drawHierarchicalNodes(
    ctx: CanvasRenderingContext2D,
    node: HierarchicalTreeNode,
    layout: LayoutDimensions,
  ): void {
    // Draw current node if within bounds and not a reference
    if (
      !node.isReference &&
      node.x >= 0 &&
      node.y >= 0 &&
      node.x + node.width <= dependencyTreePngConfig.canvas.MAX_WIDTH &&
      node.y + node.height <= dependencyTreePngConfig.canvas.MAX_HEIGHT
    ) {
      this.drawHierarchicalNode(ctx, node, layout);
    }

    // Draw children recursively (only actual children, not references)
    for (const child of node.children) {
      if (!child.isReference) {
        this.drawHierarchicalNodes(ctx, child, layout);
      }
    }
  }

  /**
   * Draw a single hierarchical node
   */
  private drawHierarchicalNode(
    ctx: CanvasRenderingContext2D,
    node: HierarchicalTreeNode,
    layout: LayoutDimensions,
  ): void {
    // Determine if we're in compact mode
    const isCompactMode = layout.nodeWidth === dependencyTreePngConfig.compactLayout.NODE_WIDTH;
    const isRootLevel = node.level === 0;

    // Draw node background and border
    const fillColor = isRootLevel
      ? dependencyTreePngConfig.colors.ROOT_BACKGROUND
      : dependencyTreePngConfig.colors.NODE_BACKGROUND;
    const strokeColor = isRootLevel
      ? dependencyTreePngConfig.colors.ROOT_BORDER
      : dependencyTreePngConfig.colors.NODE_BORDER;
    const lineWidth = isRootLevel
      ? dependencyTreePngConfig.numeric.BORDER_WIDTH_ROOT
      : dependencyTreePngConfig.numeric.BORDER_WIDTH_NODE;
    this.drawRectangle(
      ctx,
      node.x,
      node.y,
      node.width,
      node.height,
      fillColor,
      strokeColor,
      lineWidth,
    );

    // Draw class name - ALWAYS show full classpath without abbreviation or truncation
    const displayText = node.classpath;
    const classNameFont = `${isRootLevel ? dependencyTreePngConfig.text.FONT_WEIGHT_BOLD : ""}${layout.fontSize}px ${dependencyTreePngConfig.text.FONT_FAMILY}`;
    const textPadding = isCompactMode
      ? dependencyTreePngConfig.numeric.TEXT_PADDING_COMPACT
      : dependencyTreePngConfig.numeric.TEXT_PADDING_REGULAR;
    const textY =
      node.y +
      node.height / 2 +
      layout.fontSize / 2 -
      dependencyTreePngConfig.numeric.TEXT_BASELINE_ADJUSTMENT;
    this.drawText(
      ctx,
      displayText,
      node.x + textPadding,
      textY,
      classNameFont,
      dependencyTreePngConfig.colors.TEXT,
      "left",
    );

    // Draw level indicator (smaller in compact mode)
    const levelFontSize = isCompactMode
      ? layout.fontSize - dependencyTreePngConfig.numeric.FONT_SIZE_LEVEL_OFFSET_COMPACT
      : layout.fontSize - dependencyTreePngConfig.numeric.FONT_SIZE_LEVEL_OFFSET_REGULAR;
    const levelFont = `${levelFontSize}px ${dependencyTreePngConfig.text.FONT_FAMILY}`;
    const levelPadding = isCompactMode
      ? dependencyTreePngConfig.numeric.LEVEL_PADDING_COMPACT
      : dependencyTreePngConfig.numeric.LEVEL_PADDING_REGULAR;
    const levelY = isCompactMode
      ? node.y + dependencyTreePngConfig.numeric.LEVEL_Y_COMPACT
      : node.y + dependencyTreePngConfig.numeric.LEVEL_Y_REGULAR;
    this.drawText(
      ctx,
      `${dependencyTreePngConfig.text.LEVEL_PREFIX}${node.level}`,
      node.x + node.width - levelPadding,
      levelY,
      levelFont,
      dependencyTreePngConfig.colors.LEVEL_INDICATOR,
      "right",
    );
  }

  /**
   * Count total number of nodes in hierarchical dependency tree
   */
  private countTotalNodes(dependencies: readonly HierarchicalJavaClassDependency[]): number {
    let count = dependencies.length;

    for (const dep of dependencies) {
      if (dep.dependencies && dep.dependencies.length > 0) {
        count += this.countTotalNodes(dep.dependencies);
      }
    }

    return count;
  }

  /**
   * Draw a rectangle with border
   */
  private drawRectangle(
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
  private drawLine(
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
  private drawText(
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
  private drawArrow(
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
  private drawConnectionLine(
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
