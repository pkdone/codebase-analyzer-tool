/**
 * Central theme configuration for brand colors and visual styling.
 * This is the single source of truth for brand colors and diagram styling
 * used throughout the reporting module.
 *
 * CSS variables are generated at runtime from this configuration via
 * generateBrandColorCssVariables() and injected into HTML reports.
 */

/**
 * MongoDB brand color palette.
 * These are the official MongoDB brand colors used throughout the application.
 */
export const BRAND_COLORS = {
  /** MongoDB Green Dark - Primary brand color */
  greenDark: "#00684A",
  /** MongoDB Green Light - Accent/highlight color */
  greenLight: "#00ED64",
  /** MongoDB Black - Primary text and dark backgrounds */
  black: "#001E2B",
  /** MongoDB Grey Dark - Secondary text */
  greyDark1: "#3F3E42",
  /** MongoDB Grey Light - Subtle backgrounds */
  greyLight1: "#C1C7C6",
  /** MongoDB Grey Light - Card backgrounds, stripes */
  greyLight2: "#E8EDEB",
  /** MongoDB White - Primary backgrounds */
  white: "#FFFFFF",
} as const;

/**
 * Type representing the brand color keys.
 */
export type BrandColorKey = keyof typeof BRAND_COLORS;

/**
 * Mapping from TypeScript BRAND_COLORS keys to CSS variable names.
 * CSS uses kebab-case with `--mdb-` prefix while TypeScript uses camelCase.
 */
const BRAND_COLOR_CSS_VAR_MAP: Record<BrandColorKey, string> = {
  greenDark: "--mdb-green-dark",
  greenLight: "--mdb-green-light",
  black: "--mdb-black",
  greyDark1: "--mdb-grey-dark-1",
  greyLight1: "--mdb-grey-light-1",
  greyLight2: "--mdb-grey-light-2",
  white: "--mdb-white",
} as const;

/**
 * Generates CSS variable declarations for brand colors.
 * This function produces the content for a :root {} block that defines
 * CSS variables from the TypeScript BRAND_COLORS constant.
 *
 * @returns CSS variable declarations string (without :root wrapper)
 * @example
 * generateBrandColorCssVariables()
 * // Returns:
 * // "  --mdb-green-dark: #00684A;\n  --mdb-green-light: #00ED64;\n..."
 */
function generateBrandColorCssVariables(): string {
  const entries = Object.entries(BRAND_COLORS) as [BrandColorKey, string][];
  return entries.map(([key, value]) => `  ${BRAND_COLOR_CSS_VAR_MAP[key]}: ${value};`).join("\n");
}

/**
 * Generates a complete CSS :root block with brand color variables.
 * This is used to inject brand colors into HTML reports at runtime,
 * eliminating the need to duplicate hex values in CSS files.
 *
 * @returns Complete CSS :root block string
 */
export function generateBrandColorCssBlock(): string {
  return `:root {\n  /* MongoDB Brand Colors - Generated from brand-theme.config.ts */\n${generateBrandColorCssVariables()}\n}`;
}

/**
 * Shared styling constants for SVG diagrams.
 * Used by mermaid-builders.ts and diagram generators for consistent styling.
 */
export const DIAGRAM_STYLES = {
  /** Background color for rendered Mermaid diagrams (derived from brand greys) */
  backgroundColor: "#F0F3F2",
  /** Padding around the diagram content within the SVG canvas */
  diagramPadding: 30,
  /** Font family for empty diagram placeholders */
  emptyDiagramFontFamily: "system-ui, sans-serif",
  /** Font size for empty diagram placeholder text */
  emptyDiagramFontSize: "14",
  /** Text color for empty diagram placeholder messages */
  emptyDiagramTextColor: "#8b95a1",
} as const;

/**
 * Semantic colors for diagram elements.
 * Maps domain concepts to specific colors for consistent visualization.
 * These are specific to reporting diagrams and not used elsewhere in the application.
 */
export const DIAGRAM_ELEMENT_COLORS = {
  /** Bounded context fill color (light green) */
  boundedContextFill: "#e8f5e8",
  /** Aggregate fill color (light blue) */
  aggregateFill: "#e3f2fd",
  /** Aggregate stroke color (blue) */
  aggregateStroke: "#1976d2",
  /** Entity fill color (light purple) */
  entityFill: "#f3e5f5",
  /** Entity stroke color (purple) */
  entityStroke: "#7b1fa2",
  /** Repository fill color (light orange) */
  repositoryFill: "#fff5f0",
  /** Repository stroke color (orange) */
  repositoryStroke: "#d2691e",
  /** External component fill color (light orange) */
  externalComponentFill: "#fff3e0",
  /** External component stroke color (orange) */
  externalComponentStroke: "#e65100",
  /** Dependency fill color (light grey) */
  dependencyFill: "#f8f9fa",
  /** Dependency stroke color (grey) */
  dependencyStroke: "#6c757d",
} as const;

/**
 * Type representing the diagram element color keys.
 */
export type DiagramElementColorKey = keyof typeof DIAGRAM_ELEMENT_COLORS;
