/**
 * Tests for theme CSS generation utilities.
 * Validates that brand color CSS variables are generated correctly from TypeScript constants.
 */

import {
  BRAND_COLORS,
  generateBrandColorCssBlock,
  type BrandColorKey,
} from "../../../../../src/app/components/reporting/config/brand-theme.config";

describe("Theme CSS Generation", () => {
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
      expect(generatedBlock).toContain("Generated from brand-theme.config.ts");
    });

    it("should include all brand color hex values", () => {
      Object.values(BRAND_COLORS).forEach((hexValue) => {
        expect(generatedBlock).toContain(hexValue);
      });
    });

    it("should include CSS variable names with --mdb- prefix", () => {
      expect(generatedBlock).toContain("--mdb-green-dark");
      expect(generatedBlock).toContain("--mdb-green-light");
      expect(generatedBlock).toContain("--mdb-black");
      expect(generatedBlock).toContain("--mdb-white");
    });

    it("should be valid CSS that can be prepended to other CSS", () => {
      // The block should start with :root and end with }
      expect(generatedBlock.trim()).toMatch(/^:root\s*\{[\s\S]*\}$/);
    });

    it("should have correct variable-to-value mapping for key colors", () => {
      // Check that the green-dark variable maps to the correct hex value
      expect(generatedBlock).toMatch(/--mdb-green-dark:\s*#00684A;/);
      expect(generatedBlock).toMatch(/--mdb-black:\s*#001E2B;/);
    });
  });

  describe("BRAND_COLORS", () => {
    it("should have all expected brand color keys", () => {
      const expectedKeys: BrandColorKey[] = [
        "greenDark",
        "greenLight",
        "black",
        "greyDark1",
        "greyLight1",
        "greyLight2",
        "white",
      ];
      expect(Object.keys(BRAND_COLORS).sort()).toEqual(expectedKeys.sort());
    });

    it("should have valid hex color values", () => {
      Object.values(BRAND_COLORS).forEach((hexValue) => {
        expect(hexValue).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});
