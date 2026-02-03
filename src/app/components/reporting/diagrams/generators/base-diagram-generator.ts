import {
  generateEmptyDiagramSvg,
  buildCompactInitDirective,
  buildSpaciousInitDirective,
} from "../utils";
import { buildStyleDefinitions } from "../utils";

/**
 * Diagram layout preset determining spacing and padding configuration.
 * - "compact": Minimal padding around diagram content
 * - "spacious": Additional spacing for better node distribution (used for architecture diagrams)
 */
export type DiagramLayoutPreset = "compact" | "spacious";

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
 * - Diagram initialization with directives and styles
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
   * Initialize a Mermaid diagram with the standard preamble.
   * Creates the initial lines array with the init directive, graph type, and style definitions.
   * This consolidates the common initialization pattern used across all diagram generators.
   *
   * @param graphDeclaration - The graph type declaration (e.g., "flowchart TB", "graph LR")
   * @param layoutPreset - The layout preset to use ("compact" or "spacious")
   * @returns Array of lines with the diagram preamble already added
   */
  protected initializeDiagram(
    graphDeclaration: string,
    layoutPreset: DiagramLayoutPreset = "compact",
  ): string[] {
    const initDirective =
      layoutPreset === "spacious" ? buildSpaciousInitDirective() : buildCompactInitDirective();

    return [initDirective, graphDeclaration, buildStyleDefinitions()];
  }

  /**
   * Wrap a Mermaid definition for client-side rendering.
   * Styling is handled by the .mermaid-diagram CSS class in style.css.
   *
   * @param definition - The Mermaid diagram definition string
   * @returns HTML string with the mermaid definition ready for client-side rendering
   */
  protected wrapForClientRendering(definition: string): string {
    return `<pre class="mermaid mermaid-diagram">\n${definition}\n</pre>`;
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
   * Generic diagram generation method that consolidates the common pattern:
   * 1. Merge options
   * 2. Check if data is empty
   * 3. Build diagram definition
   * 4. Wrap for client rendering
   *
   * @param data - The data to generate the diagram from
   * @param options - Diagram generation options
   * @param isEmpty - Function to check if data is empty
   * @param emptyMessage - Message to display when data is empty
   * @param builderFn - Function that builds the Mermaid definition from data
   * @returns HTML string with embedded Mermaid definition
   */
  protected generateDiagram<TData>(
    data: TData,
    options: TOptions,
    isEmpty: (data: TData) => boolean,
    emptyMessage: string,
    builderFn: (data: TData) => string,
  ): string {
    this.mergeOptions(options);

    if (isEmpty(data)) {
      return this.generateEmptyDiagram(emptyMessage);
    }

    const mermaidDefinition = builderFn(data);
    return this.wrapForClientRendering(mermaidDefinition);
  }
}
