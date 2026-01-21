/**
 * Tests to validate that CSS variables in style.css match TypeScript theme constants.
 * This ensures the two sources of truth for brand colors don't drift apart.
 */

import * as fs from "fs";
import * as path from "path";
import { BRAND_COLORS } from "../../../src/app/config/theme.config";

/**
 * Mapping between TypeScript BRAND_COLORS keys and their CSS variable names.
 * The CSS uses kebab-case with `--mdb-` prefix while TypeScript uses camelCase.
 */
const TS_TO_CSS_VAR_MAP: Record<keyof typeof BRAND_COLORS, string> = {
  greenDark: "--mdb-green-dark",
  greenLight: "--mdb-green-light",
  black: "--mdb-black",
  greyDark1: "--mdb-grey-dark-1",
  greyLight1: "--mdb-grey-light-1",
  greyLight2: "--mdb-grey-light-2",
  white: "--mdb-white",
};

/**
 * Parse CSS file content and extract CSS variable definitions from :root.
 * Returns a map of variable name to its value (hex color).
 */
function extractCssVariables(cssContent: string): Map<string, string> {
  const variables = new Map<string, string>();

  // Match :root block content
  const rootBlockRegex = /:root\s*\{([^}]+)\}/;
  const rootBlockMatch = rootBlockRegex.exec(cssContent);
  if (!rootBlockMatch) {
    return variables;
  }

  const rootContent = rootBlockMatch[1];

  // Match CSS variable declarations (--name: #HEXCOLOR;)
  const varRegex = /(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g;
  let match;

  while ((match = varRegex.exec(rootContent)) !== null) {
    const varName = match[1];
    const value = match[2].toUpperCase();
    variables.set(varName, value);
  }

  return variables;
}

describe("Theme CSS Sync", () => {
  let cssContent: string;
  let cssVariables: Map<string, string>;

  beforeAll(() => {
    const cssPath = path.join(
      __dirname,
      "../../../src/app/components/reporting/templates/style.css",
    );
    cssContent = fs.readFileSync(cssPath, "utf-8");
    cssVariables = extractCssVariables(cssContent);
  });

  describe("CSS variables exist for all brand colors", () => {
    const colorKeys = Object.keys(BRAND_COLORS) as (keyof typeof BRAND_COLORS)[];

    test.each(colorKeys)("CSS has variable for BRAND_COLORS.%s", (colorKey) => {
      const cssVarName = TS_TO_CSS_VAR_MAP[colorKey];
      expect(cssVariables.has(cssVarName)).toBe(true);
    });
  });

  describe("CSS variable values match TypeScript brand colors", () => {
    const colorEntries = Object.entries(BRAND_COLORS) as [keyof typeof BRAND_COLORS, string][];

    test.each(colorEntries)("BRAND_COLORS.%s matches CSS variable value", (colorKey, tsValue) => {
      const cssVarName = TS_TO_CSS_VAR_MAP[colorKey];
      const cssValue = cssVariables.get(cssVarName);

      expect(cssValue).toBeDefined();
      expect(cssValue?.toUpperCase()).toBe(tsValue.toUpperCase());
    });
  });

  describe("All MongoDB CSS color variables are accounted for", () => {
    it("should have no unmatched --mdb-* color variables", () => {
      const mdbVariables = Array.from(cssVariables.keys()).filter((name) =>
        name.startsWith("--mdb-"),
      );
      const mappedCssVars = Object.values(TS_TO_CSS_VAR_MAP);

      const unmatchedVars = mdbVariables.filter((v) => !mappedCssVars.includes(v));

      expect(unmatchedVars).toEqual([]);
    });
  });

  describe("CSS parsing validation", () => {
    it("should find :root block with CSS variables", () => {
      expect(cssVariables.size).toBeGreaterThan(0);
    });

    it("should find all expected MongoDB color variables", () => {
      const expectedVarCount = Object.keys(BRAND_COLORS).length;
      const mdbVarCount = Array.from(cssVariables.keys()).filter((name) =>
        name.startsWith("--mdb-"),
      ).length;

      expect(mdbVarCount).toBe(expectedVarCount);
    });
  });
});
