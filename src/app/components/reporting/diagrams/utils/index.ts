/**
 * Mermaid diagram utilities - public API
 *
 * App-specific functions (init directives, style definitions) are provided locally.
 * For core Mermaid utilities (escapeMermaidLabel, generateNodeId, buildArrow,
 * applyStyleClass), import directly from `src/common/diagrams/mermaid`.
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
} from "./mermaid-builders";

export {
  buildStyleDefinitions,
  type DiagramThemeConfig,
  type DiagramBrandColors,
  type DiagramElementColors,
  type DiagramCssClassNames,
} from "./mermaid-styles";
