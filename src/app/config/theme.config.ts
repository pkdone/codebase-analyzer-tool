/**
 * Central theme configuration for brand colors and visual styling.
 * This is the single source of truth for colors used across the application,
 * particularly in diagrams and visualizations that cannot use CSS variables.
 *
 * Note: style.css defines these same colors as CSS variables for HTML/CSS consumers.
 * When updating colors here, ensure style.css is also updated to maintain consistency.
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
 * Semantic colors for diagram elements.
 * Maps domain concepts to specific colors for consistent visualization.
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
 * Type representing the brand color keys.
 */
export type BrandColorKey = keyof typeof BRAND_COLORS;

/**
 * Type representing the diagram element color keys.
 */
export type DiagramElementColorKey = keyof typeof DIAGRAM_ELEMENT_COLORS;
