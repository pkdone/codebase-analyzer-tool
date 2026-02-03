/**
 * Domain-specific style definitions for Mermaid diagrams.
 * These styles are used by various diagram generators to apply consistent
 * visual styling to domain model elements like bounded contexts, entities, etc.
 *
 * The applyStyleClass utility function is provided by the common Mermaid module.
 */

import { BRAND_COLORS, DIAGRAM_ELEMENT_COLORS } from "../../config/brand-theme.config";
import { DIAGRAM_CSS_CLASSES } from "../../config/diagram-css-classes.config";

/**
 * Brand colors required for diagram styling.
 */
export interface DiagramBrandColors {
  greenDark: string;
  black: string;
  white: string;
}

/**
 * Element-specific colors for diagram nodes.
 */
export interface DiagramElementColors {
  boundedContextFill: string;
  aggregateFill: string;
  aggregateStroke: string;
  entityFill: string;
  entityStroke: string;
  repositoryFill: string;
  repositoryStroke: string;
  externalComponentFill: string;
  externalComponentStroke: string;
  dependencyFill: string;
  dependencyStroke: string;
}

/**
 * CSS class names for diagram elements.
 */
export interface DiagramCssClassNames {
  BOUNDED_CONTEXT: string;
  AGGREGATE: string;
  ENTITY: string;
  REPOSITORY: string;
  SERVICE: string;
  PROCESS: string;
  DEPENDENCY: string;
  ROOT_DEPENDENCY: string;
  INTERNAL_COMPONENT: string;
  EXTERNAL_COMPONENT: string;
}

/**
 * Complete theme configuration for diagram styling.
 * All properties are optional - defaults from brand-theme.config are used if not provided.
 */
export interface DiagramThemeConfig {
  brandColors?: DiagramBrandColors;
  elementColors?: DiagramElementColors;
  cssClasses?: DiagramCssClassNames;
}

/**
 * Default theme configuration using the application's brand colors.
 * Exported for use by callers who want to explicitly pass the default theme.
 */
export const DEFAULT_DIAGRAM_THEME: Required<DiagramThemeConfig> = {
  brandColors: {
    greenDark: BRAND_COLORS.greenDark,
    black: BRAND_COLORS.black,
    white: BRAND_COLORS.white,
  },
  elementColors: { ...DIAGRAM_ELEMENT_COLORS },
  cssClasses: { ...DIAGRAM_CSS_CLASSES },
};

/**
 * Build Mermaid classDef style definitions for domain model visualization.
 * Uses Mermaid's classDef syntax for consistent styling across diagrams.
 *
 * @param config - Optional theme configuration. If not provided, uses default brand theme.
 * @returns Mermaid classDef style definitions string
 *
 * @example
 * ```typescript
 * // Using default theme
 * const styles = buildStyleDefinitions();
 *
 * // Using custom theme
 * const customStyles = buildStyleDefinitions({
 *   brandColors: { greenDark: "#custom", black: "#000", white: "#fff" }
 * });
 * ```
 */
export function buildStyleDefinitions(config?: DiagramThemeConfig): string {
  const brandColors = config?.brandColors ?? DEFAULT_DIAGRAM_THEME.brandColors;
  const elementColors = config?.elementColors ?? DEFAULT_DIAGRAM_THEME.elementColors;
  const cssClasses = config?.cssClasses ?? DEFAULT_DIAGRAM_THEME.cssClasses;

  const { greenDark, black, white } = brandColors;
  const {
    boundedContextFill,
    aggregateFill,
    aggregateStroke,
    entityFill,
    entityStroke,
    repositoryFill,
    repositoryStroke,
    externalComponentFill,
    externalComponentStroke,
    dependencyFill,
    dependencyStroke,
  } = elementColors;

  const {
    BOUNDED_CONTEXT,
    AGGREGATE,
    ENTITY,
    REPOSITORY,
    SERVICE,
    PROCESS,
    DEPENDENCY,
    ROOT_DEPENDENCY,
    INTERNAL_COMPONENT,
    EXTERNAL_COMPONENT,
  } = cssClasses;

  return `
    classDef ${BOUNDED_CONTEXT} fill:${boundedContextFill},stroke:${greenDark},stroke-width:3px,color:${black}
    classDef ${AGGREGATE} fill:${aggregateFill},stroke:${aggregateStroke},stroke-width:2px,color:${black}
    classDef ${ENTITY} fill:${entityFill},stroke:${entityStroke},stroke-width:1.5px,color:${black}
    classDef ${REPOSITORY} fill:${repositoryFill},stroke:${repositoryStroke},stroke-width:1.5px,color:${black}
    classDef ${SERVICE} fill:${white},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef ${PROCESS} fill:${white},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef ${DEPENDENCY} fill:${dependencyFill},stroke:${dependencyStroke},stroke-width:1px,color:${black}
    classDef ${ROOT_DEPENDENCY} fill:${aggregateFill},stroke:${aggregateStroke},stroke-width:2px,color:${black}
    classDef ${INTERNAL_COMPONENT} fill:${boundedContextFill},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef ${EXTERNAL_COMPONENT} fill:${externalComponentFill},stroke:${externalComponentStroke},stroke-width:2px,color:${black}`;
}
