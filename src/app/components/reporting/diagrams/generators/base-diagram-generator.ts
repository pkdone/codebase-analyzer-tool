import {
  DIAGRAM_STYLES,
  generateEmptyDiagramSvg,
  buildMermaidInitDirective,
  buildArchitectureInitDirective,
} from "../utils";
import { buildStyleDefinitions } from "../utils";

/**
 * Type of initialization directive to use for the diagram.
 */
export type DiagramInitDirectiveType = "standard" | "architecture";

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
   * @param directiveType - The type of init directive to use ("standard" or "architecture")
   * @returns Array of lines with the diagram preamble already added
   */
  protected initializeDiagram(
    graphDeclaration: string,
    directiveType: DiagramInitDirectiveType = "standard",
  ): string[] {
    const initDirective =
      directiveType === "architecture"
        ? buildArchitectureInitDirective()
        : buildMermaidInitDirective();

    return [initDirective, graphDeclaration, buildStyleDefinitions()];
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
