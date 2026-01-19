/**
 * Central theme configuration for brand colors and visual styling.
 * This is the single source of truth for brand colors used across the application,
 * particularly in diagrams and visualizations that cannot use CSS variables.
 *
 * Note: style.css defines these same colors as CSS variables for HTML/CSS consumers.
 * When updating colors here, ensure style.css is also updated to maintain consistency.
 *
 * Domain-specific diagram colors are defined in:
 * src/app/components/reporting/diagrams/utils/diagram-theme.config.ts
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
