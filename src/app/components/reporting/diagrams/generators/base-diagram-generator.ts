import { DIAGRAM_STYLES, generateEmptyDiagramSvg } from "../utils";

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
 * Abstract base class for Mermaid-based diagram generators.
 *
 * This class provides common functionality shared by all Mermaid diagram generators:
 * - Default options handling with width and height
 * - Empty diagram placeholder generation
 * - Dimension calculation utilities
 *
 * Diagrams are rendered client-side using Mermaid.js. Generators return
 * Mermaid definition strings that are embedded in HTML as <pre class="mermaid"> tags.
 */
export abstract class BaseDiagramGenerator<TOptions extends BaseDiagramOptions> {
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
}
