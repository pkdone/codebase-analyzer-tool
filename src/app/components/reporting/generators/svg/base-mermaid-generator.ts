import type { MermaidRenderer } from "../mermaid/mermaid-renderer";
import { DIAGRAM_STYLES, generateEmptyDiagramSvg } from "../mermaid/mermaid-definition-builders";

/**
 * Base interface for diagram options with standard width and height properties.
 */
export interface BaseDiagramOptions {
  width?: number;
  height?: number;
}

/**
 * Abstract base class for Mermaid-based SVG generators.
 *
 * This class provides common functionality shared by all Mermaid diagram generators:
 * - Default options handling with width and height
 * - Empty diagram placeholder generation
 * - Consistent rendering with the MermaidRenderer
 *
 * Subclasses should:
 * 1. Define their specific `defaultOptions` with required width/height
 * 2. Implement diagram-specific generation methods that use `renderDiagram()` and `generateEmptyDiagram()`
 */
export abstract class BaseMermaidGenerator<TOptions extends BaseDiagramOptions> {
  /**
   * Default options for diagram rendering.
   * Subclasses must provide their own defaults with required width and height.
   */
  protected abstract readonly defaultOptions: Required<TOptions>;

  constructor(protected readonly mermaidRenderer: MermaidRenderer) {}

  /**
   * Generate an empty diagram placeholder SVG with a message.
   *
   * @param message - The message to display in the placeholder
   * @returns SVG string for the empty diagram placeholder
   */
  protected generateEmptyDiagram(message: string): string {
    return generateEmptyDiagramSvg(message);
  }

  /**
   * Render a Mermaid diagram definition to SVG.
   * Uses the standard background color from DIAGRAM_STYLES for consistency.
   *
   * @param definition - The Mermaid diagram definition string
   * @param width - The width of the rendered diagram
   * @param height - The height of the rendered diagram
   * @returns Promise resolving to the rendered SVG string
   */
  protected async renderDiagram(
    definition: string,
    width: number,
    height: number,
  ): Promise<string> {
    return this.mermaidRenderer.renderToSvg(definition, {
      width,
      height,
      backgroundColor: DIAGRAM_STYLES.backgroundColor,
    });
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
}
