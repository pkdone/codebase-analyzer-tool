/**
 * Mermaid diagram utilities - public API
 */
export { DIAGRAM_STYLES } from "./diagram-theme.config";

export {
  buildMermaidInitDirective,
  buildArchitectureInitDirective,
  generateEmptyDiagramSvg,
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "./mermaid-builders";

export { buildStyleDefinitions, applyStyle } from "./mermaid-styles";
