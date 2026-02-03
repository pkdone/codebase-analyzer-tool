/**
 * Mermaid diagram utilities - public API
 *
 * Core Mermaid utilities are re-exported from the common module.
 * App-specific functions (init directives, style definitions) are provided locally.
 */
export {
  DIAGRAM_STYLES,
  DIAGRAM_ELEMENT_COLORS,
  type DiagramElementColorKey,
} from "../../config/brand-theme.config";

export {
  buildCompactInitDirective,
  buildSpaciousInitDirective,
  generateEmptyDiagramSvg,
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "./mermaid-builders";

export {
  buildStyleDefinitions,
  DEFAULT_DIAGRAM_THEME,
  type DiagramThemeConfig,
  type DiagramBrandColors,
  type DiagramElementColors,
  type DiagramCssClassNames,
} from "./mermaid-styles";

// Re-export applyStyleClass from common module for diagram generators
export { applyStyleClass } from "../../../../../common/diagrams/mermaid/mermaid-utils";
