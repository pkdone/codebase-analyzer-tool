import { injectable } from "tsyringe";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";
import fs from "fs";
import type { JavaClassDependency, HierarchicalJavaClassDependency } from "../../repositories/source/sources.model";

interface TreeNode {
  classpath: string;
  level: number;
  references: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  private readonly NODE_WIDTH = 300;
  private readonly NODE_HEIGHT = 40;
  private readonly LEVEL_HEIGHT = 80;
  private readonly HORIZONTAL_SPACING = 20;
  private readonly VERTICAL_SPACING = 15;
  private readonly FONT_SIZE = 12;
  private readonly CANVAS_PADDING = 40;
  
  // Compact layout dimensions for complex trees
  private readonly COMPACT_NODE_WIDTH = 180;
  private readonly COMPACT_NODE_HEIGHT = 25;
  private readonly COMPACT_LEVEL_HEIGHT = 40;
  private readonly COMPACT_HORIZONTAL_SPACING = 10;
  private readonly COMPACT_VERTICAL_SPACING = 8;
  private readonly COMPACT_FONT_SIZE = 9;
  private readonly COMPACT_CANVAS_PADDING = 20;
  
  private readonly MAX_CANVAS_WIDTH = 8000;
  private readonly MAX_CANVAS_HEIGHT = 8000;
  private readonly MIN_CANVAS_WIDTH = 800;
  private readonly MIN_CANVAS_HEIGHT = 600;
  private readonly COMPLEX_TREE_THRESHOLD = 50; // Switch to compact mode at 50+ nodes

  /**
   * Generate a PNG file showing the dependency tree for a specific Java class
   */
  async generateDependencyTreePng(
    classpath: string,
    dependencies: JavaClassDependency[],
    outputDir: string
  ): Promise<string> {
    // Create a safe filename from the classpath
    const filename = this.createSafeFilename(classpath);
    const filepath = path.join(outputDir, `${filename}.png`);

    // Organize dependencies by level
    const nodesByLevel = this.organizeDependenciesByLevel(dependencies);
    
    // Calculate canvas dimensions
    const { width, height } = this.calculateCanvasDimensions(nodesByLevel);
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Draw the dependency tree
    this.drawDependencyTree(ctx, classpath, nodesByLevel, width, height);

    // Save to file
    const buffer = canvas.toBuffer("image/png");
    await fs.promises.writeFile(filepath, buffer);

    return filename + ".png";
  }

  /**
   * Generate a PNG file showing the hierarchical dependency tree for a specific Java class
   */
  async generateHierarchicalDependencyTreePng(
    classpath: string,
    hierarchicalDependencies: readonly HierarchicalJavaClassDependency[],
    outputDir: string
  ): Promise<string> {
    try {
      // Create a safe filename from the classpath
      const filename = this.createSafeFilename(classpath);
      const filepath = path.join(outputDir, `${filename}.png`);

      // Check if dependency tree is complex and determine layout mode
      const totalNodes = this.countTotalNodes(hierarchicalDependencies);
      const useCompactMode = totalNodes > this.COMPLEX_TREE_THRESHOLD;
      const layout = this.getLayoutDimensions(useCompactMode);
      
      if (useCompactMode) {
        console.log(`Dependency tree for ${classpath} has ${totalNodes} nodes, using compact layout`);
      }

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
        children: []
      };
      
      // Register root node and build children with proper level assignment
      nodeRegistry.set(classpath, rootNode);
      
      // Build tree using original level information from flat data
      rootNode.children = this.convertHierarchicalToTreeNodes(hierarchicalDependencies, layout, nodeRegistry);
      
      // Calculate positions for all nodes
      this.calculateHierarchicalPositions(rootNode, layout);
      
      // Calculate canvas dimensions
      const { width, height } = this.calculateHierarchicalCanvasDimensions(rootNode, layout);
      
      // Validate dimensions before creating canvas
      if (width <= 0 || height <= 0 || width > this.MAX_CANVAS_WIDTH || height > this.MAX_CANVAS_HEIGHT) {
        throw new Error(`Canvas dimensions ${width}x${height} exceed limits even with compact layout`);
      }
      
      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Draw the hierarchical dependency tree
      this.drawHierarchicalDependencyTree(ctx, classpath, rootNode, width, height, layout);

      // Save to file
      const buffer = canvas.toBuffer("image/png");
      await fs.promises.writeFile(filepath, buffer);

      return filename + ".png";
    } catch (error) {
      console.warn(`Failed to generate dependency tree for ${classpath}:`, error);
      throw error; // Re-throw since we removed the fallback to simplified PNG
    }
  }

  /**
   * Get layout dimensions based on complexity mode
   */
  private getLayoutDimensions(useCompactMode: boolean): LayoutDimensions {
    return useCompactMode ? {
      nodeWidth: this.COMPACT_NODE_WIDTH,
      nodeHeight: this.COMPACT_NODE_HEIGHT,
      levelHeight: this.COMPACT_LEVEL_HEIGHT,
      horizontalSpacing: this.COMPACT_HORIZONTAL_SPACING,
      verticalSpacing: this.COMPACT_VERTICAL_SPACING,
      fontSize: this.COMPACT_FONT_SIZE,
      canvasPadding: this.COMPACT_CANVAS_PADDING,
    } : {
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
   * Abbreviate a Java classpath for compact display
   */
  private abbreviateClasspath(classpath: string, useCompactMode: boolean): string {
    if (!useCompactMode) {
      return classpath;
    }

    const parts = classpath.split('.');
    if (parts.length <= 2) {
      return classpath; // Too short to abbreviate
    }

    // Keep first letter of each package part, full class name
    const className = parts[parts.length - 1];
    const packageParts = parts.slice(0, -1);
    const abbreviatedPackage = packageParts.map(part => part.charAt(0)).join('.');
    
    return `${abbreviatedPackage}.${className}`;
  }

  /**
   * Create a filesystem-safe filename from a Java classpath
   */
  private createSafeFilename(classpath: string): string {
    return classpath
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Organize dependencies by their hierarchy level
   */
  private organizeDependenciesByLevel(dependencies: JavaClassDependency[]): Map<number, TreeNode[]> {
    const nodesByLevel = new Map<number, TreeNode[]>();
    
    dependencies.forEach(dep => {
      if (!nodesByLevel.has(dep.level)) {
        nodesByLevel.set(dep.level, []);
      }
      
      const nodes = nodesByLevel.get(dep.level);
      if (!nodes) return;
      nodes.push({
        classpath: dep.classpath,
        level: dep.level,
        references: [...dep.references],
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        width: this.NODE_WIDTH,
        height: this.NODE_HEIGHT,
      });
    });

    // Sort levels
    const sortedLevels = new Map([...nodesByLevel.entries()].sort((a, b) => a[0] - b[0]));
    
    // Calculate positions for each node
    this.calculateNodePositions(sortedLevels);
    
    return sortedLevels;
  }

  /**
   * Calculate x,y positions for all nodes in the tree
   */
  private calculateNodePositions(nodesByLevel: Map<number, TreeNode[]>): void {
    let currentY = this.CANVAS_PADDING;
    
    for (const [, nodes] of nodesByLevel) {
      let currentX = this.CANVAS_PADDING;
      
      nodes.forEach((node) => {
        node.x = currentX;
        node.y = currentY;
        currentX += this.NODE_WIDTH + this.HORIZONTAL_SPACING;
      });
      
      currentY += this.NODE_HEIGHT + this.VERTICAL_SPACING + this.LEVEL_HEIGHT;
    }
  }

  /**
   * Calculate maximum width needed for the canvas
   */
  private calculateMaxWidth(nodesByLevel: Map<number, TreeNode[]>): number {
    let maxWidth = 0;
    
    for (const nodes of nodesByLevel.values()) {
      const levelWidth = nodes.length * (this.NODE_WIDTH + this.HORIZONTAL_SPACING) - this.HORIZONTAL_SPACING;
      maxWidth = Math.max(maxWidth, levelWidth);
    }
    
    return maxWidth + (2 * this.CANVAS_PADDING);
  }

  /**
   * Calculate the required canvas dimensions
   */
  private calculateCanvasDimensions(nodesByLevel: Map<number, TreeNode[]>): { width: number; height: number } {
    const levels = nodesByLevel.size;
    const calculatedWidth = this.calculateMaxWidth(nodesByLevel);
    const calculatedHeight = (levels * (this.NODE_HEIGHT + this.VERTICAL_SPACING + this.LEVEL_HEIGHT)) + (2 * this.CANVAS_PADDING);
    
    // Apply bounds
    const width = Math.min(Math.max(calculatedWidth, this.MIN_CANVAS_WIDTH), this.MAX_CANVAS_WIDTH);
    const height = Math.min(Math.max(calculatedHeight, this.MIN_CANVAS_HEIGHT), this.MAX_CANVAS_HEIGHT);
    
    // Log dimensions for debugging
    console.log(`Canvas dimensions: ${width}x${height} (calculated: ${calculatedWidth}x${calculatedHeight})`);
    
    return { width, height };
  }

  /**
   * Draw the complete dependency tree on the canvas
   */
  private drawDependencyTree(
    ctx: CanvasRenderingContext2D,
    mainClasspath: string,
    nodesByLevel: Map<number, TreeNode[]>,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Set canvas background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw title
    this.drawTitle(ctx, mainClasspath, canvasWidth);

    // Draw nodes and connections
    this.drawConnections(ctx, nodesByLevel);
    this.drawNodes(ctx, nodesByLevel);
  }

  /**
   * Draw the title at the top of the canvas
   */
  private drawTitle(ctx: CanvasRenderingContext2D, mainClasspath: string, canvasWidth: number): void {
    ctx.font = `bold ${this.FONT_SIZE + 4}px Arial`;
    ctx.fillStyle = "#333333";
    ctx.textAlign = "center";
    
    const titleText = `Dependency Tree: ${mainClasspath}`;
    ctx.fillText(titleText, canvasWidth / 2, 25);
  }

  /**
   * Draw connection lines between dependency levels
   */
  private drawConnections(ctx: CanvasRenderingContext2D, nodesByLevel: Map<number, TreeNode[]>): void {
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;
    
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < levels.length - 1; i++) {
      const currentLevelNodes = nodesByLevel.get(levels[i]);
      const nextLevelNodes = nodesByLevel.get(levels[i + 1]);
      
      if (!currentLevelNodes || !nextLevelNodes) continue;
      
      currentLevelNodes.forEach(currentNode => {
        // Collect all targets for this node to enable staggering
        const targetNodesForStaggering: HierarchicalTreeNode[] = [];
        
        nextLevelNodes.forEach(nextNode => {
          if (currentNode.references.includes(nextNode.classpath)) {
            const toNodeForFlat: HierarchicalTreeNode = {
              classpath: nextNode.classpath,
              level: 0,
              x: nextNode.x,
              y: nextNode.y,
              width: nextNode.width,
              height: nextNode.height,
              children: []
            };
            targetNodesForStaggering.push(toNodeForFlat);
          }
        });
        
        // Draw all connections from this node with staggering
        if (targetNodesForStaggering.length > 0) {
          const fromNodeForFlat: HierarchicalTreeNode = {
            classpath: currentNode.classpath,
            level: 0,
            x: currentNode.x,
            y: currentNode.y,
            width: currentNode.width,
            height: currentNode.height,
            children: []
          };
          
          this.drawConnectionsWithStaggering(ctx, fromNodeForFlat, targetNodesForStaggering);
        }
      });
    }
  }

  /**
   * Draw all nodes (class boxes) on the canvas
   */
  private drawNodes(ctx: CanvasRenderingContext2D, nodesByLevel: Map<number, TreeNode[]>): void {
    for (const [level, nodes] of nodesByLevel) {
      nodes.forEach(node => {
        this.drawNode(ctx, node, level);
      });
    }
  }

  /**
   * Draw a single node (class box)
   */
  private drawNode(ctx: CanvasRenderingContext2D, node: TreeNode, level: number): void {
    // Draw node background
    const isRootLevel = level === 0;
    ctx.fillStyle = isRootLevel ? "#e8f4fd" : "#f5f5f5";
    ctx.fillRect(node.x, node.y, node.width, node.height);

    // Draw node border
    ctx.strokeStyle = isRootLevel ? "#2196F3" : "#cccccc";
    ctx.lineWidth = isRootLevel ? 2 : 1;
    ctx.strokeRect(node.x, node.y, node.width, node.height);

    // Draw class name
    ctx.font = `${isRootLevel ? 'bold ' : ''}${this.FONT_SIZE}px Arial`;
    ctx.fillStyle = "#333333";
    ctx.textAlign = "left";
    
    // Truncate text if too long
    const maxTextWidth = node.width - 10;
    let displayText = node.classpath;
    const textMetrics = ctx.measureText(displayText);
    
    if (textMetrics.width > maxTextWidth) {
      // Find the class name (last part after the last dot)
      const parts = node.classpath.split('.');
      displayText = parts[parts.length - 1];
      
      // If still too long, truncate with ellipsis
      if (ctx.measureText(displayText).width > maxTextWidth) {
        while (ctx.measureText(displayText + "...").width > maxTextWidth && displayText.length > 1) {
          displayText = displayText.slice(0, -1);
        }
        displayText += "...";
      }
    }
    
    ctx.fillText(displayText, node.x + 5, node.y + node.height / 2 + this.FONT_SIZE / 2 - 2);
    
    // Draw level indicator
    ctx.font = `${this.FONT_SIZE - 2}px Arial`;
    ctx.fillStyle = "#666666";
    ctx.textAlign = "right";
    ctx.fillText(`L${level}`, node.x + node.width - 5, node.y + 15);
  }

  /**
   * Convert hierarchical dependencies to tree nodes using original levels, avoiding duplicates
   */
  private convertHierarchicalToTreeNodes(
    hierarchicalDeps: readonly HierarchicalJavaClassDependency[],
    layout: LayoutDimensions,
    nodeRegistry: Map<string, HierarchicalTreeNode>
  ): HierarchicalTreeNode[] {
    return hierarchicalDeps.map((dep: HierarchicalJavaClassDependency): HierarchicalTreeNode => {
      // Check if this node already exists
      const existingNode = nodeRegistry.get(dep.classpath);
      // Use original level from flat data, defaulting to 1 if not provided
      const properLevel = dep.originalLevel ?? 1;
      
      if (existingNode) {
        // Create a reference node instead of a duplicate
        return {
          classpath: dep.classpath,
          level: properLevel,
          x: 0,
          y: 0,
          width: layout.nodeWidth,
          height: layout.nodeHeight,
          children: [],
          isReference: true,
          referenceTo: existingNode
        };
      } else {
        // Create a new node with original level
        const newNode: HierarchicalTreeNode = {
          classpath: dep.classpath,
          level: properLevel,
          x: 0,
          y: 0,
          width: layout.nodeWidth,
          height: layout.nodeHeight,
          children: []
        };
        
        // Register the node before processing children to handle circular references
        nodeRegistry.set(dep.classpath, newNode);
        
        // Process children
        newNode.children = dep.dependencies ? 
          this.convertHierarchicalToTreeNodes(dep.dependencies, layout, nodeRegistry) : [];
        
        return newNode;
      }
    });
  }

  /**
   * Calculate positions for hierarchical tree nodes based on proper levels
   */
  private calculateHierarchicalPositions(rootNode: HierarchicalTreeNode, layout: LayoutDimensions): void {
    // Collect all nodes by their proper levels
    const nodesByLevel = new Map<number, HierarchicalTreeNode[]>();
    this.collectNodesByLevel(rootNode, nodesByLevel);
    
    // Position nodes level by level
    this.positionNodesByLevel(nodesByLevel, layout);
  }

  /**
   * Collect all nodes organized by their proper levels
   */
  private collectNodesByLevel(node: HierarchicalTreeNode, nodesByLevel: Map<number, HierarchicalTreeNode[]>): void {
    // Only collect actual nodes, not references
    if (!node.isReference) {
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, []);
      }
      const nodes = nodesByLevel.get(node.level);
      if (nodes) {
        nodes.push(node);
      }
      
      // Recursively collect children
      for (const child of node.children) {
        this.collectNodesByLevel(child, nodesByLevel);
      }
    }
  }

  /**
   * Position nodes level by level
   */
  private positionNodesByLevel(nodesByLevel: Map<number, HierarchicalTreeNode[]>, layout: LayoutDimensions): void {
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    
    for (const level of levels) {
      const nodes = nodesByLevel.get(level);
      if (!nodes) continue;
      
      const y = layout.canvasPadding + (level * (layout.nodeHeight + layout.levelHeight));
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
  private calculateHierarchicalCanvasDimensions(rootNode: HierarchicalTreeNode, layout: LayoutDimensions): { width: number; height: number } {
    // Collect all actual nodes by level to calculate proper dimensions
    const nodesByLevel = new Map<number, HierarchicalTreeNode[]>();
    this.collectNodesByLevel(rootNode, nodesByLevel);
    
    const { maxX, maxY } = this.getMaxDimensionsFromLevels(nodesByLevel);
    
    const calculatedWidth = Math.max(maxX + layout.canvasPadding, this.MIN_CANVAS_WIDTH);
    const calculatedHeight = Math.max(maxY + layout.nodeHeight + layout.canvasPadding, this.MIN_CANVAS_HEIGHT);
    
    // Apply maximum bounds to prevent canvas creation errors
    const width = Math.min(calculatedWidth, this.MAX_CANVAS_WIDTH);
    const height = Math.min(calculatedHeight, this.MAX_CANVAS_HEIGHT);
    
    // Log dimensions for debugging
    console.log(`Canvas dimensions: ${width}x${height} (calculated: ${calculatedWidth}x${calculatedHeight})`);
    
    return { width, height };
  }

  /**
   * Get maximum dimensions from nodes organized by levels
   */
  private getMaxDimensionsFromLevels(nodesByLevel: Map<number, HierarchicalTreeNode[]>): { maxX: number; maxY: number } {
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
    layout: LayoutDimensions
  ): void {
    // Set canvas background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw title
    this.drawTitle(ctx, mainClasspath, canvasWidth);

    // Draw connections and nodes
    this.drawHierarchicalConnections(ctx, rootNode);
    this.drawHierarchicalNodes(ctx, rootNode, layout);
  }

  /**
   * Draw connections between hierarchical nodes
   */
  private drawHierarchicalConnections(ctx: CanvasRenderingContext2D, node: HierarchicalTreeNode): void {
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;

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
    targetNodes: HierarchicalTreeNode[]
  ): void {
    // Group targets by direction type
    const horizontalTargets: HierarchicalTreeNode[] = [];
    const verticalTargets: HierarchicalTreeNode[] = [];
    
    for (const target of targetNodes) {
      const deltaX = (target.x + target.width / 2) - (sourceNode.x + sourceNode.width / 2);
      const deltaY = (target.y + target.height / 2) - (sourceNode.y + sourceNode.height / 2);
      
      // Check if this is a horizontal connection (not downward)
      if (deltaY <= 0 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        horizontalTargets.push(target);
      } else {
        verticalTargets.push(target);
      }
    }
    
    // Draw vertical connections normally
    for (const target of verticalTargets) {
      this.drawConnectionLine(ctx, sourceNode, target, "#cccccc");
    }
    
    // Draw horizontal connections with staggering
    if (horizontalTargets.length > 1) {
      const staggerOffset = 8; // Pixels to offset each arrow
      const startOffset = -((horizontalTargets.length - 1) * staggerOffset) / 2;
      
      horizontalTargets.forEach((target, index) => {
        const yOffset = startOffset + (index * staggerOffset);
        this.drawConnectionLineWithYOffset(ctx, sourceNode, target, "#cccccc", yOffset);
      });
    } else if (horizontalTargets.length === 1) {
      // Single horizontal connection - no staggering needed
      this.drawConnectionLine(ctx, sourceNode, horizontalTargets[0], "#cccccc");
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
    yOffset: number
  ): void {
    // Only draw if target node is within canvas bounds
    if (toNode.x >= 0 && toNode.y >= 0 && 
        toNode.x + toNode.width <= this.MAX_CANVAS_WIDTH && 
        toNode.y + toNode.height <= this.MAX_CANVAS_HEIGHT) {
      
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
    color: string
  ): void {
    // Only draw if both nodes are within canvas bounds
    if (toNode.x >= 0 && toNode.y >= 0 && 
        toNode.x + toNode.width <= this.MAX_CANVAS_WIDTH && 
        toNode.y + toNode.height <= this.MAX_CANVAS_HEIGHT) {
      
      // Calculate smart connection points based on node positions
      const { fromX, fromY, toX, toY } = this.calculateConnectionPoints(fromNode, toNode);
      
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2; // Consistent line thickness for all connections
      
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
    toNode: HierarchicalTreeNode
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
    } else {
      // Primarily horizontal connection (or upward with significant horizontal component)
      if (deltaX > 0) {
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
    color: string
  ): void {
    // Consistent arrow size for all connections
    const arrowLength = 10;
    
    // Calculate angle of the line
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Calculate arrow points (30-degree angle for arrow wings)
    const arrowX1 = toX - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowY1 = toY - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowX2 = toX - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowY2 = toY - arrowLength * Math.sin(angle + Math.PI / 6);
    
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
  private drawHierarchicalNodes(ctx: CanvasRenderingContext2D, node: HierarchicalTreeNode, layout: LayoutDimensions): void {
    // Draw current node if within bounds and not a reference
    if (!node.isReference && 
        node.x >= 0 && node.y >= 0 && 
        node.x + node.width <= this.MAX_CANVAS_WIDTH && 
        node.y + node.height <= this.MAX_CANVAS_HEIGHT) {
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
  private drawHierarchicalNode(ctx: CanvasRenderingContext2D, node: HierarchicalTreeNode, layout: LayoutDimensions): void {
    // Determine if we're in compact mode
    const isCompactMode = layout.nodeWidth === this.COMPACT_NODE_WIDTH;
    const isRootLevel = node.level === 0;
    
    // Draw node background
    ctx.fillStyle = isRootLevel ? "#e8f4fd" : "#f5f5f5";
    ctx.fillRect(node.x, node.y, node.width, node.height);

    // Draw node border
    ctx.strokeStyle = isRootLevel ? "#2196F3" : "#cccccc";
    ctx.lineWidth = isRootLevel ? 2 : 1;
    ctx.strokeRect(node.x, node.y, node.width, node.height);

    // Draw class name with appropriate abbreviation and font size
    ctx.font = `${isRootLevel ? 'bold ' : ''}${layout.fontSize}px Arial`;
    ctx.fillStyle = "#333333";
    ctx.textAlign = "left";
    
    // Get abbreviated text for compact mode
    let displayText = isCompactMode ? 
      this.abbreviateClasspath(node.classpath, true) : 
      node.classpath;
    
    // Truncate text if still too long
    const maxTextWidth = node.width - (isCompactMode ? 6 : 10);
    const textMetrics = ctx.measureText(displayText);
    
    if (textMetrics.width > maxTextWidth) {
      if (!isCompactMode) {
        // Find the class name (last part after the last dot)
        const parts = node.classpath.split('.');
        displayText = parts[parts.length - 1];
      }
      
      // If still too long, truncate with ellipsis
      if (ctx.measureText(displayText).width > maxTextWidth) {
        while (ctx.measureText(displayText + "...").width > maxTextWidth && displayText.length > 1) {
          displayText = displayText.slice(0, -1);
        }
        displayText += "...";
      }
    }
    
    const textPadding = isCompactMode ? 3 : 5;
    const textY = node.y + node.height / 2 + layout.fontSize / 2 - 2;
    ctx.fillText(displayText, node.x + textPadding, textY);
    
    // Draw level indicator (smaller in compact mode)
    const levelFontSize = isCompactMode ? layout.fontSize - 1 : layout.fontSize - 2;
    ctx.font = `${levelFontSize}px Arial`;
    ctx.fillStyle = "#666666";
    ctx.textAlign = "right";
    const levelPadding = isCompactMode ? 3 : 5;
    const levelY = isCompactMode ? node.y + 12 : node.y + 15;
    ctx.fillText(`L${node.level}`, node.x + node.width - levelPadding, levelY);
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
