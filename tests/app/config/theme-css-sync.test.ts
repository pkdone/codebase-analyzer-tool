/**
 * Tests for theme CSS generation utilities.
 * Validates that brand color CSS variables are generated correctly from TypeScript constants.
 */

import {
  BRAND_COLORS,
  BRAND_COLOR_CSS_VAR_MAP,
  generateBrandColorCssVariables,
  generateBrandColorCssBlock,
  type BrandColorKey,
} from "../../../src/app/config/theme.config";

describe("Theme CSS Generation", () => {
  describe("BRAND_COLOR_CSS_VAR_MAP", () => {
    it("should have a CSS variable name for every brand color", () => {
      const brandColorKeys = Object.keys(BRAND_COLORS) as BrandColorKey[];
      const mappedKeys = Object.keys(BRAND_COLOR_CSS_VAR_MAP) as BrandColorKey[];

      expect(mappedKeys).toHaveLength(brandColorKeys.length);
      brandColorKeys.forEach((key) => {
        expect(BRAND_COLOR_CSS_VAR_MAP).toHaveProperty(key);
      });
    });

    it("should use kebab-case with --mdb- prefix for all CSS variable names", () => {
      Object.values(BRAND_COLOR_CSS_VAR_MAP).forEach((cssVarName) => {
        expect(cssVarName).toMatch(/^--mdb-[a-z0-9-]+$/);
      });
    });

    it("should have unique CSS variable names", () => {
      const varNames = Object.values(BRAND_COLOR_CSS_VAR_MAP);
      const uniqueNames = new Set(varNames);
      expect(uniqueNames.size).toBe(varNames.length);
    });
  });

  describe("generateBrandColorCssVariables", () => {
    let generatedCss: string;

    beforeAll(() => {
      generatedCss = generateBrandColorCssVariables();
    });

    it("should generate non-empty CSS variable declarations", () => {
      expect(generatedCss).toBeTruthy();
      expect(generatedCss.length).toBeGreaterThan(0);
    });

    it("should include all brand color CSS variable names", () => {
      Object.values(BRAND_COLOR_CSS_VAR_MAP).forEach((cssVarName) => {
        expect(generatedCss).toContain(cssVarName);
      });
    });

    it("should include all brand color hex values", () => {
      Object.values(BRAND_COLORS).forEach((hexValue) => {
        expect(generatedCss).toContain(hexValue);
      });
    });

    it("should generate valid CSS variable declaration format", () => {
      const lines = generatedCss.split("\n");
      lines.forEach((line) => {
        // Each line should match pattern: "  --variable-name: #HEXCODE;"
        expect(line).toMatch(/^\s+--[\w-]+:\s+#[0-9A-Fa-f]{6};$/);
      });
    });

    it("should have correct variable-to-value mapping", () => {
      const colorEntries = Object.entries(BRAND_COLORS) as [BrandColorKey, string][];
      colorEntries.forEach(([key, hexValue]) => {
        const cssVarName = BRAND_COLOR_CSS_VAR_MAP[key];
        const expectedPattern = new RegExp(`${cssVarName}:\\s*${hexValue};`);
        expect(generatedCss).toMatch(expectedPattern);
      });
    });
  });

  describe("generateBrandColorCssBlock", () => {
    let generatedBlock: string;

    beforeAll(() => {
      generatedBlock = generateBrandColorCssBlock();
    });

    it("should wrap variables in :root block", () => {
      expect(generatedBlock).toContain(":root {");
      expect(generatedBlock).toContain("}");
    });

    it("should include a comment indicating the source", () => {
      expect(generatedBlock).toContain("Generated from theme.config.ts");
    });

    it("should include all brand color CSS variables", () => {
      Object.values(BRAND_COLOR_CSS_VAR_MAP).forEach((cssVarName) => {
        expect(generatedBlock).toContain(cssVarName);
      });
    });

    it("should be valid CSS that can be prepended to other CSS", () => {
      // The block should start with :root and end with }
      expect(generatedBlock.trim()).toMatch(/^:root\s*\{[\s\S]*\}$/);
    });
  });

  describe("CSS Variable Name Mapping Consistency", () => {
    it("should map greenDark to --mdb-green-dark", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.greenDark).toBe("--mdb-green-dark");
    });

    it("should map greenLight to --mdb-green-light", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.greenLight).toBe("--mdb-green-light");
    });

    it("should map black to --mdb-black", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.black).toBe("--mdb-black");
    });

    it("should map greyDark1 to --mdb-grey-dark-1", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.greyDark1).toBe("--mdb-grey-dark-1");
    });

    it("should map greyLight1 to --mdb-grey-light-1", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.greyLight1).toBe("--mdb-grey-light-1");
    });

    it("should map greyLight2 to --mdb-grey-light-2", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.greyLight2).toBe("--mdb-grey-light-2");
    });

    it("should map white to --mdb-white", () => {
      expect(BRAND_COLOR_CSS_VAR_MAP.white).toBe("--mdb-white");
    });
  });
});
