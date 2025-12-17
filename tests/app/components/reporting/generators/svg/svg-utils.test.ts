import {
  escapeXml,
  sanitizeId,
  wrapText,
  createSvgHeader,
  generateEmptyDiagram,
} from "../../../../../../src/app/components/reporting/generators/svg/svg-utils";

describe("SVG Utilities", () => {
  describe("escapeXml", () => {
    it("should escape ampersand", () => {
      expect(escapeXml("A & B")).toBe("A &amp; B");
    });

    it("should escape less than", () => {
      expect(escapeXml("A < B")).toBe("A &lt; B");
    });

    it("should escape greater than", () => {
      expect(escapeXml("A > B")).toBe("A &gt; B");
    });

    it("should escape double quotes", () => {
      expect(escapeXml('A "B" C')).toBe("A &quot;B&quot; C");
    });

    it("should escape single quotes", () => {
      expect(escapeXml("A 'B' C")).toBe("A &#39;B&#39; C");
    });

    it("should escape multiple special characters", () => {
      expect(escapeXml('<script>alert("XSS")</script>')).toBe(
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;",
      );
    });

    it("should handle text without special characters", () => {
      expect(escapeXml("Hello World")).toBe("Hello World");
    });

    it("should handle empty string", () => {
      expect(escapeXml("")).toBe("");
    });
  });

  describe("sanitizeId", () => {
    it("should convert to lowercase", () => {
      expect(sanitizeId("HelloWorld")).toBe("helloworld");
    });

    it("should replace non-alphanumeric characters with hyphens", () => {
      expect(sanitizeId("Hello World")).toBe("hello-world");
    });

    it("should preserve hyphens and underscores", () => {
      expect(sanitizeId("hello-world_test")).toBe("hello-world_test");
    });

    it("should handle special characters", () => {
      expect(sanitizeId("Hello@World#123")).toBe("hello-world-123");
    });

    it("should handle multiple consecutive special characters", () => {
      expect(sanitizeId("Hello!!!World")).toBe("hello---world");
    });

    it("should handle empty string", () => {
      expect(sanitizeId("")).toBe("");
    });
  });

  describe("wrapText", () => {
    it("should return single line for short text", () => {
      const result = wrapText("Short text", 200, 12);
      expect(result).toEqual(["Short text"]);
    });

    it("should wrap long text into multiple lines", () => {
      const longText = "This is a very long text that should be wrapped into multiple lines";
      const result = wrapText(longText, 100, 12);
      expect(result.length).toBeGreaterThan(1);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should limit output to 3 lines maximum", () => {
      const veryLongText =
        "Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10 Word11 Word12 Word13 Word14 Word15";
      const result = wrapText(veryLongText, 50, 12);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should handle text that fits exactly in width", () => {
      const text = "Exactly fitting text";
      const result = wrapText(text, 200, 12);
      expect(result).toEqual([text]);
    });

    it("should handle empty string", () => {
      const result = wrapText("", 100, 12);
      expect(result).toEqual([""]);
    });

    it("should handle single very long word", () => {
      const longWord = "Supercalifragilisticexpialidocious";
      const result = wrapText(longWord, 50, 12);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe(longWord);
    });
  });

  describe("createSvgHeader", () => {
    it("should create SVG header with default arrowhead color", () => {
      const header = createSvgHeader(800, 600);
      expect(header).toContain('width="800"');
      expect(header).toContain('height="600"');
      expect(header).toContain('fill="#00684A"');
      expect(header).toContain("<svg");
      expect(header).toContain("<defs>");
      expect(header).toContain("<marker");
    });

    it("should create SVG header with custom arrowhead color", () => {
      const header = createSvgHeader(800, 600, "#FF0000");
      expect(header).toContain('fill="#FF0000"');
    });

    it("should include viewBox attribute", () => {
      const header = createSvgHeader(800, 600);
      expect(header).toContain('viewBox="0 0 800 600"');
    });

    it("should include arrowhead marker definition", () => {
      const header = createSvgHeader(800, 600);
      expect(header).toContain('id="arrowhead"');
      expect(header).toContain("markerWidth");
      expect(header).toContain("markerHeight");
    });
  });

  describe("generateEmptyDiagram", () => {
    it("should generate empty diagram with message", () => {
      const diagram = generateEmptyDiagram(800, 600, "No data", "Arial", 14);
      expect(diagram).toContain('width="800"');
      expect(diagram).toContain('height="600"');
      expect(diagram).toContain("<svg");
      expect(diagram).toContain("<text");
    });

    it("should escape XML in message", () => {
      const diagram = generateEmptyDiagram(800, 600, 'Test "message"', "Arial", 14);
      expect(diagram).toContain("&quot;message&quot;");
    });

    it("should center text in diagram", () => {
      const diagram = generateEmptyDiagram(800, 600, "No data", "Arial", 14);
      expect(diagram).toContain('x="400"'); // centerX = width / 2
      expect(diagram).toContain('y="300"'); // centerY = height / 2
      expect(diagram).toContain('text-anchor="middle"');
    });

    it("should use provided font family and size", () => {
      const diagram = generateEmptyDiagram(800, 600, "No data", "Times New Roman", 16);
      expect(diagram).toContain('font-family="Times New Roman"');
      expect(diagram).toContain('font-size="16"');
    });

    it("should include background color and border radius", () => {
      const diagram = generateEmptyDiagram(800, 600, "No data", "Arial", 14);
      expect(diagram).toContain("background-color: #f8f9fa");
      expect(diagram).toContain("border-radius: 8px");
    });
  });
});
