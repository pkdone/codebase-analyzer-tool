import { DIAGRAM_STYLES, generateEmptyDiagramSvg } from "../mermaid/mermaid-definition-builders";

/**
 * Base interface for diagram options with standard width and height properties.
 * Note: Width and height are now hints for calculating content-responsive dimensions
 * since diagrams are rendered client-side.
 */
export interface BaseDiagramOptions {
  width?: number;
  height?: number;
}

/**
 * Configuration for calculating diagram dimensions based on content.
 */
export interface DimensionConfig {
  /** Minimum width of the diagram */
  minWidth: number;
  /** Minimum height of the diagram */
  minHeight: number;
  /** Width to add per node/element */
  widthPerNode?: number;
  /** Height to add per node/element */
  heightPerNode?: number;
  /** Maximum allowed width */
  maxWidth?: number;
  /** Maximum allowed height */
  maxHeight?: number;
}

/**
 * Result of dimension calculation.
 */
export interface CalculatedDimensions {
  width: number;
  height: number;
}

/**
 * Abstract base class for Mermaid-based diagram generators.
 *
 * This class provides common functionality shared by all Mermaid diagram generators:
 * - Default options handling with width and height
 * - Empty diagram placeholder generation
 * - Dimension calculation utilities
 *
 * Diagrams are now rendered client-side using Mermaid.js. Generators return
 * Mermaid definition strings that are embedded in HTML as <pre class="mermaid"> tags.
 */
export abstract class BaseMermaidGenerator<TOptions extends BaseDiagramOptions> {
  /**
   * Default options for diagram generation.
   * Subclasses must provide their own defaults with required width and height.
   */
  protected abstract readonly defaultOptions: Required<TOptions>;

  /**
   * Generate an empty diagram placeholder SVG with a message.
   * This returns an actual SVG for cases where there's no data to display.
   *
   * @param message - The message to display in the placeholder
   * @returns SVG string for the empty diagram placeholder
   */
  protected generateEmptyDiagram(message: string): string {
    return generateEmptyDiagramSvg(message);
  }

  /**
   * Wrap a Mermaid definition for client-side rendering.
   * Adds container div with appropriate styling.
   *
   * @param definition - The Mermaid diagram definition string
   * @returns HTML string with the mermaid definition ready for client-side rendering
   */
  protected wrapForClientRendering(definition: string): string {
    return `<pre class="mermaid" style="background-color: ${DIAGRAM_STYLES.backgroundColor}; border-radius: 8px; padding: 20px; overflow-x: auto;">\n${definition}\n</pre>`;
  }

  /**
   * Merge provided options with defaults.
   * Utility method for subclasses to handle option merging consistently.
   *
   * @param options - The options provided by the caller
   * @returns Merged options with defaults applied
   */
  protected mergeOptions(options: TOptions): Required<TOptions> {
    return { ...this.defaultOptions, ...options };
  }

  /**
   * Calculate dynamic diagram dimensions based on content size.
   * Standardizes the common pattern of Math.max(default, count * multiplier)
   * used across diagram generators for responsive sizing.
   *
   * @param nodeCount - Number of nodes/elements in the diagram
   * @param config - Configuration for dimension calculation
   * @returns Calculated width and height for the diagram
   */
  protected calculateDimensions(nodeCount: number, config: DimensionConfig): CalculatedDimensions {
    const {
      minWidth,
      minHeight,
      widthPerNode = 0,
      heightPerNode = 0,
      maxWidth,
      maxHeight,
    } = config;

    let width = Math.max(minWidth, nodeCount * widthPerNode);
    let height = Math.max(minHeight, nodeCount * heightPerNode);

    // Apply maximum constraints if specified
    if (maxWidth !== undefined) {
      width = Math.min(width, maxWidth);
    }
    if (maxHeight !== undefined) {
      height = Math.min(height, maxHeight);
    }

    return { width, height };
  }
}
