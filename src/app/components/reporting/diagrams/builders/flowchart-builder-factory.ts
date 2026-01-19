/**
 * Factory for creating MermaidFlowchartBuilder instances with app-specific styles.
 *
 * This factory injects the application's style definitions and initialization directives
 * into the generic MermaidFlowchartBuilder from the common module.
 */

import {
  MermaidFlowchartBuilder,
  type FlowchartDirection,
} from "../../../../../common/diagrams/mermaid";
import {
  buildMermaidInitDirective,
  buildArchitectureInitDirective,
} from "../utils/mermaid-builders";
import { buildStyleDefinitions } from "../utils/mermaid-styles";

/**
 * Type of initialization directive to use for the diagram.
 */
export type InitDirectiveType = "standard" | "architecture";

/**
 * Options for creating a flowchart builder.
 */
export interface CreateFlowchartBuilderOptions {
  /**
   * The flowchart direction (TB, BT, LR, RL).
   * @default "TB"
   */
  direction?: FlowchartDirection;

  /**
   * The type of init directive to use.
   * @default "standard"
   */
  initDirectiveType?: InitDirectiveType;
}

/**
 * Creates a MermaidFlowchartBuilder configured with the application's styles and init directives.
 *
 * This factory encapsulates the coupling between the generic builder and app-specific
 * configuration, allowing generators to create builders without knowing about styling details.
 *
 * @param options - Configuration options for the builder
 * @returns A configured MermaidFlowchartBuilder instance
 *
 * @example
 * ```typescript
 * const builder = createFlowchartBuilder({ direction: "TB" });
 * builder.addNode("svc1", "User Service", "stadium");
 * const diagram = builder.render();
 * ```
 */
export function createFlowchartBuilder(
  options: CreateFlowchartBuilderOptions = {},
): MermaidFlowchartBuilder {
  const { direction = "TB", initDirectiveType = "standard" } = options;

  const initDirective =
    initDirectiveType === "architecture"
      ? buildArchitectureInitDirective()
      : buildMermaidInitDirective();

  const styleDefinitions = buildStyleDefinitions();

  return new MermaidFlowchartBuilder({
    direction,
    initDirective,
    styleDefinitions,
  });
}
