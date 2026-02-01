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
 * Build Mermaid classDef style definitions for domain model visualization.
 * Uses Mermaid's classDef syntax for consistent styling across diagrams.
 * Colors are sourced from the central theme configuration.
 * Class names are sourced from the centralized DIAGRAM_CSS_CLASSES config.
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
  } = DIAGRAM_CSS_CLASSES;

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
