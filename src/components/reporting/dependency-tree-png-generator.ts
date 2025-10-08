import { injectable } from "tsyringe";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";
import { writeBinaryFile } from "../../common/utils/file-operations";
import type { HierarchicalJavaClassDependency } from "../../repositories/source/sources.model";
import { logWarningMsg } from "../../common/utils/logging";

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
  // Layout dimensions
  private readonly NODE_WIDTH = 400;
  private readonly NODE_HEIGHT = 45;
  private readonly LEVEL_HEIGHT = 80;
  private readonly HORIZONTAL_SPACING = 20;
  private readonly VERTICAL_SPACING = 15;
  private readonly FONT_SIZE = 12;
  private readonly CANVAS_PADDING = 40;
  private readonly COMPACT_NODE_WIDTH = 350;
  private readonly COMPACT_NODE_HEIGHT = 30;
  private readonly COMPACT_LEVEL_HEIGHT = 45;
  private readonly COMPACT_HORIZONTAL_SPACING = 15;
  private readonly COMPACT_VERTICAL_SPACING = 10;
  private readonly COMPACT_FONT_SIZE = 10;
  private readonly COMPACT_CANVAS_PADDING = 25;
  private readonly MAX_CANVAS_WIDTH = 8000;
  private readonly MAX_CANVAS_HEIGHT = 8000;
  private readonly MIN_CANVAS_WIDTH = 800;
  private readonly MIN_CANVAS_HEIGHT = 600;
  private readonly COMPLEX_TREE_THRESHOLD = 50; // Switch to compact mode at 50+ nodes

  // Colors
  private readonly COLORS = {
    WHITE: "#ffffff",
    ROOT_BACKGROUND: "#e8f4fd",
    NODE_BACKGROUND: "#f5f5f5",
    ROOT_BORDER: "#2196F3",
    NODE_BORDER: "#cccccc",
    CONNECTION: "#cccccc",
    TEXT: "#333333",
    LEVEL_INDICATOR: "#666666",
  } as const;

  // Text constants
  private readonly TEXT = {
    FONT_FAMILY: "Arial",
    FONT_WEIGHT_BOLD: "bold ",
    LEVEL_PREFIX: "L",
    TITLE_PREFIX: "Dependency Tree: ",
  } as const;

  // File constants
  private readonly FILE = {
    FORMAT: "image/png",
    EXTENSION: ".png",
  } as const;

  // Numeric constants
  private readonly NUMERIC = {
    TITLE_Y_POSITION: 25,
    TEXT_PADDING_REGULAR: 5,
    TEXT_PADDING_COMPACT: 3,
    LEVEL_PADDING_REGULAR: 5,
    LEVEL_PADDING_COMPACT: 3,
    LEVEL_Y_REGULAR: 15,
    LEVEL_Y_COMPACT: 12,
    STAGGER_OFFSET: 8,
    ARROW_LENGTH: 10,
    ARROW_ANGLE_DEGREES: 30,
    ARROW_ANGLE_RADIANS: Math.PI / 6,
    FONT_SIZE_TITLE_OFFSET: 4,
    FONT_SIZE_LEVEL_OFFSET_REGULAR: 2,
    FONT_SIZE_LEVEL_OFFSET_COMPACT: 1,
    BORDER_WIDTH_ROOT: 2,
    BORDER_WIDTH_NODE: 1,
    CONNECTION_WIDTH: 2,
  } as const;

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
      const useCompactMode = totalNodes > this.COMPLEX_TREE_THRESHOLD;
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
        width > this.MAX_CANVAS_WIDTH ||
        height > this.MAX_CANVAS_HEIGHT
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
      const buffer = canvas.toBuffer(this.FILE.FORMAT);
      await writeBinaryFile(filepath, buffer);
      return filename + this.FILE.EXTENSION;
    } catch (error: unknown) {
      logWarningMsg(`Failed to generate dependency tree for ${classpath}: ${String(error)}`);
      throw error; // Re-throw since we removed the fallback to simplified PNG
    }
  }

  /**
   * Get layout dimensions based on complexity mode
   */
  private getLayoutDimensions(useCompactMode: boolean): LayoutDimensions {
    return useCompactMode
      ? {
          nodeWidth: this.COMPACT_NODE_WIDTH,
          nodeHeight: this.COMPACT_NODE_HEIGHT,
          levelHeight: this.COMPACT_LEVEL_HEIGHT,
          horizontalSpacing: this.COMPACT_HORIZONTAL_SPACING,
          verticalSpacing: this.COMPACT_VERTICAL_SPACING,
          fontSize: this.COMPACT_FONT_SIZE,
          canvasPadding: this.COMPACT_CANVAS_PADDING,
        }
      : {
          nodeWidth: this.NODE_WIDTH,
          nodeHeight: this.NODE_HEIGHT,
          levelHeight: this.LEVEL_HEIGHT,
          horizontalSpacing: this.HORIZONTAL_SPACING,
          verticalSpacing: this.VERTICAL_SPACING,
          fontSize: this.FONT_SIZE,
          canvasPadding: this.CANVAS_PADDING,
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
    ctx.font = `${this.TEXT.FONT_WEIGHT_BOLD}${this.FONT_SIZE + this.NUMERIC.FONT_SIZE_TITLE_OFFSET}px ${this.TEXT.FONT_FAMILY}`;
    ctx.fillStyle = this.COLORS.TEXT;
    ctx.textAlign = "center";
    const titleText = `${this.TEXT.TITLE_PREFIX}${mainClasspath}`;
    ctx.fillText(titleText, canvasWidth / 2, this.NUMERIC.TITLE_Y_POSITION);
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
    const calculatedWidth = Math.max(maxX + layout.canvasPadding, this.MIN_CANVAS_WIDTH);
    const calculatedHeight = Math.max(
      maxY + layout.nodeHeight + layout.canvasPadding,
      this.MIN_CANVAS_HEIGHT,
    );
    const width = Math.min(calculatedWidth, this.MAX_CANVAS_WIDTH);
    const height = Math.min(calculatedHeight, this.MAX_CANVAS_HEIGHT);
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
    ctx.fillStyle = this.COLORS.WHITE;
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
    ctx.strokeStyle = this.COLORS.CONNECTION;
    ctx.lineWidth = this.NUMERIC.CONNECTION_WIDTH;
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
      this.drawConnectionLine(ctx, sourceNode, target, this.COLORS.CONNECTION);
    }

    // Draw horizontal connections with staggering
    if (horizontalTargets.length > 1) {
      const staggerOffset = this.NUMERIC.STAGGER_OFFSET; // Pixels to offset each arrow
      const startOffset = -((horizontalTargets.length - 1) * staggerOffset) / 2;

      horizontalTargets.forEach((target, index) => {
        const yOffset = startOffset + index * staggerOffset;
        this.drawConnectionLineWithYOffset(
          ctx,
          sourceNode,
          target,
          this.COLORS.CONNECTION,
          yOffset,
        );
      });
    } else if (horizontalTargets.length === 1) {
      // Single horizontal connection - no staggering needed
      this.drawConnectionLine(ctx, sourceNode, horizontalTargets[0], this.COLORS.CONNECTION);
    }
  }

  /**
   * Draw a connection line with Y offset for staggering
   */
  private drawConnectionLineWithYOffset(
    ctx: CanvasRenderingContext2D,
    fromNode: HierarchicalTreeNode,
    toNode: HierarchicalTreeNode,
    color: string,
    yOffset: number,
  ): void {
    // Only draw if target node is within canvas bounds
    if (
      toNode.x >= 0 &&
      toNode.y >= 0 &&
      toNode.x + toNode.width <= this.MAX_CANVAS_WIDTH &&
      toNode.y + toNode.height <= this.MAX_CANVAS_HEIGHT
    ) {
      // Calculate connection points with Y offset for source
      const { fromX, fromY, toX, toY } = this.calculateConnectionPoints(fromNode, toNode);

      // Apply Y offset to the source point for horizontal staggering
      const adjustedFromY = fromY + yOffset;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;

      // Draw the line with staggered source Y
      ctx.beginPath();
      ctx.moveTo(fromX, adjustedFromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrow with staggered position
      this.drawArrow(ctx, fromX, adjustedFromY, toX, toY, color);
    }
  }

  /**
   * Draw a connection line with arrow between two nodes using smart connection points
   */
  private drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    fromNode: HierarchicalTreeNode,
    toNode: HierarchicalTreeNode,
    color: string,
  ): void {
    // Only draw if both nodes are within canvas bounds
    if (
      toNode.x >= 0 &&
      toNode.y >= 0 &&
      toNode.x + toNode.width <= this.MAX_CANVAS_WIDTH &&
      toNode.y + toNode.height <= this.MAX_CANVAS_HEIGHT
    ) {
      // Calculate smart connection points based on node positions
      const { fromX, fromY, toX, toY } = this.calculateConnectionPoints(fromNode, toNode);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = this.NUMERIC.CONNECTION_WIDTH; // Consistent line thickness for all connections

      // Draw the line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrow at the end for ALL connections (pointing to the target node)
      // This includes both normal dependencies AND references to existing nodes
      this.drawArrow(ctx, fromX, fromY, toX, toY, color);
    }
  }

  /**
   * Calculate smart connection points between two nodes
   */
  private calculateConnectionPoints(
    fromNode: HierarchicalTreeNode,
    toNode: HierarchicalTreeNode,
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
      // This ensures arrows attach to top of target node and are visible
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
    // Consistent arrow size for all connections
    const arrowLength = this.NUMERIC.ARROW_LENGTH;

    // Calculate angle of the line
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Calculate arrow points using predefined angle
    const arrowX1 = toX - arrowLength * Math.cos(angle - this.NUMERIC.ARROW_ANGLE_RADIANS);
    const arrowY1 = toY - arrowLength * Math.sin(angle - this.NUMERIC.ARROW_ANGLE_RADIANS);
    const arrowX2 = toX - arrowLength * Math.cos(angle + this.NUMERIC.ARROW_ANGLE_RADIANS);
    const arrowY2 = toY - arrowLength * Math.sin(angle + this.NUMERIC.ARROW_ANGLE_RADIANS);

    // Draw the arrow head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(arrowX1, arrowY1);
    ctx.lineTo(arrowX2, arrowY2);
    ctx.closePath();
    ctx.fill();
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
      node.x + node.width <= this.MAX_CANVAS_WIDTH &&
      node.y + node.height <= this.MAX_CANVAS_HEIGHT
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
    const isCompactMode = layout.nodeWidth === this.COMPACT_NODE_WIDTH;
    const isRootLevel = node.level === 0;

    // Draw node background
    ctx.fillStyle = isRootLevel ? this.COLORS.ROOT_BACKGROUND : this.COLORS.NODE_BACKGROUND;
    ctx.fillRect(node.x, node.y, node.width, node.height);

    // Draw node border
    ctx.strokeStyle = isRootLevel ? this.COLORS.ROOT_BORDER : this.COLORS.NODE_BORDER;
    ctx.lineWidth = isRootLevel ? this.NUMERIC.BORDER_WIDTH_ROOT : this.NUMERIC.BORDER_WIDTH_NODE;
    ctx.strokeRect(node.x, node.y, node.width, node.height);

    // Draw class name - ALWAYS show full classpath without abbreviation or truncation
    ctx.font = `${isRootLevel ? this.TEXT.FONT_WEIGHT_BOLD : ""}${layout.fontSize}px ${this.TEXT.FONT_FAMILY}`;
    ctx.fillStyle = this.COLORS.TEXT;
    ctx.textAlign = "left";

    // Always use full classpath text - no abbreviation or truncation
    const displayText = node.classpath;

    const textPadding = isCompactMode
      ? this.NUMERIC.TEXT_PADDING_COMPACT
      : this.NUMERIC.TEXT_PADDING_REGULAR;
    const textY = node.y + node.height / 2 + layout.fontSize / 2 - 2;
    ctx.fillText(displayText, node.x + textPadding, textY);

    // Draw level indicator (smaller in compact mode)
    const levelFontSize = isCompactMode
      ? layout.fontSize - this.NUMERIC.FONT_SIZE_LEVEL_OFFSET_COMPACT
      : layout.fontSize - this.NUMERIC.FONT_SIZE_LEVEL_OFFSET_REGULAR;
    ctx.font = `${levelFontSize}px ${this.TEXT.FONT_FAMILY}`;
    ctx.fillStyle = this.COLORS.LEVEL_INDICATOR;
    ctx.textAlign = "right";
    const levelPadding = isCompactMode
      ? this.NUMERIC.LEVEL_PADDING_COMPACT
      : this.NUMERIC.LEVEL_PADDING_REGULAR;
    const levelY = isCompactMode
      ? node.y + this.NUMERIC.LEVEL_Y_COMPACT
      : node.y + this.NUMERIC.LEVEL_Y_REGULAR;
    ctx.fillText(
      `${this.TEXT.LEVEL_PREFIX}${node.level}`,
      node.x + node.width - levelPadding,
      levelY,
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
}
