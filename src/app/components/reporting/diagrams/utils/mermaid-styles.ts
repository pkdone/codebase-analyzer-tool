/**
 * Domain-specific style definitions for Mermaid diagrams.
 * These styles are used by various diagram generators to apply consistent
 * visual styling to domain model elements like bounded contexts, entities, etc.
 *
 * The applyStyleClass utility function is provided by the common Mermaid module.
 */

import { BRAND_COLORS, DIAGRAM_ELEMENT_COLORS } from "../../config/brand-theme.config";

/**
 * Build Mermaid classDef style definitions for domain model visualization.
 * Uses Mermaid's classDef syntax for consistent styling across diagrams.
 * Colors are sourced from the central theme configuration.
 */
export function buildStyleDefinitions(): string {
  const { greenDark, black, white } = BRAND_COLORS;
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
  } = DIAGRAM_ELEMENT_COLORS;

  return `
    classDef boundedContext fill:${boundedContextFill},stroke:${greenDark},stroke-width:3px,color:${black}
    classDef aggregate fill:${aggregateFill},stroke:${aggregateStroke},stroke-width:2px,color:${black}
    classDef entity fill:${entityFill},stroke:${entityStroke},stroke-width:1.5px,color:${black}
    classDef repository fill:${repositoryFill},stroke:${repositoryStroke},stroke-width:1.5px,color:${black}
    classDef service fill:${white},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef process fill:${white},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef dependency fill:${dependencyFill},stroke:${dependencyStroke},stroke-width:1px,color:${black}
    classDef rootDependency fill:${aggregateFill},stroke:${aggregateStroke},stroke-width:2px,color:${black}
    classDef internalComponent fill:${boundedContextFill},stroke:${greenDark},stroke-width:2px,color:${black}
    classDef externalComponent fill:${externalComponentFill},stroke:${externalComponentStroke},stroke-width:2px,color:${black}`;
}
