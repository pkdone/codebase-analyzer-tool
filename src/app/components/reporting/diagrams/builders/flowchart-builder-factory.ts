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
import { buildCompactInitDirective, buildSpaciousInitDirective } from "../utils/mermaid-builders";
import { buildStyleDefinitions } from "../utils/mermaid-styles";
import type { DiagramLayoutPreset } from "../generators/base-diagram-generator";

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
   * The layout preset to use for spacing and padding.
   * @default "compact"
   */
  layoutPreset?: DiagramLayoutPreset;
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
  const { direction = "TB", layoutPreset = "compact" } = options;

  const initDirective =
    layoutPreset === "spacious" ? buildSpaciousInitDirective() : buildCompactInitDirective();

  const styleDefinitions = buildStyleDefinitions();

  return new MermaidFlowchartBuilder({
    direction,
    initDirective,
    styleDefinitions,
  });
}
