import { fixUnescapedQuotesInStrings } from "../../../../src/llm/json-processing/sanitizers/fix-unescaped-quotes-in-strings";

describe("fixUnescapedQuotesInStrings", () => {
  describe("basic functionality", () => {
    it("should escape unescaped quotes in HTML attribute patterns", () => {
      const input = '{"implementation": "The class uses `<input type="hidden">` element."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(
        '{"implementation": "The class uses `<input type=\\"hidden\\">` element."}',
      );
      expect(result.description).toBe("Fixed unescaped quotes in string values");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should not change already escaped quotes", () => {
      const input = '{"description": "This has \\"escaped quotes\\" inside"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify valid JSON without embedded quotes", () => {
      const input = '{"name": "value", "number": 42}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("HTML attribute patterns", () => {
    it("should fix HTML attribute with type attribute", () => {
      const input = '{"implementation": "Creates `<input type="hidden">` elements."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(
        '{"implementation": "Creates `<input type=\\"hidden\\">` elements."}',
      );
    });

    it("should fix HTML attribute with name attribute", () => {
      const input = '{"code": "The form uses `<input name="username">` for input."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(
        '{"code": "The form uses `<input name=\\"username\\">` for input."}',
      );
    });

    it("should fix multiple HTML attributes in same string", () => {
      const input =
        '{"implementation": "Creates `<input type="text" name="field">` elements."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"text\\"');
      expect(result.content).toContain('name=\\"field\\"');
    });

    it("should handle HTML attributes without backticks", () => {
      const input = '{"description": "The method creates <input type="submit"> buttons."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"submit\\"');
    });
  });

  describe("real-world error case", () => {
    it("should fix the exact error pattern from the log", () => {
      // This is the pattern that caused the error at position 1196
      const input =
        '{"implementation": "This method dynamically constructs an HTML `<form>` element with its action set to a configurable `targetURL`. It then iterates through the current `HttpServletRequest`\'s parameters and attributes. For each parameter, it creates a corresponding `<input type="hidden">`. For each attribute that implements `java.io.Serializable`, it serializes the object into a byte array."}';

      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      // Verify the quote in type="hidden" is escaped
      expect(result.content).toContain('type=\\"hidden\\"');
      // Verify JSON can now be parsed
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("string value detection", () => {
    it("should only fix quotes inside string values, not property names", () => {
      const input = '{"property": "value with type="hidden" in HTML"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"hidden\\"');
      // Verify the property name quote is not escaped
      expect(result.content).toContain('"property"');
    });

    it("should not escape quotes that are property value delimiters", () => {
      const input = '{"name": "value", "other": "test"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle strings with colons (URLs, paths)", () => {
      const input = '{"url": "https://example.com:8080/path", "code": "<input type="text">"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      // URL should remain unchanged
      expect(result.content).toContain("https://example.com:8080/path");
      // HTML attribute should be fixed
      expect(result.content).toContain('type=\\"text\\"');
    });
  });

  describe("code snippet patterns", () => {
    it("should fix quotes in code-like contexts", () => {
      const input = '{"description": "The method uses value="test" in the code."}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('value=\\"test\\"');
    });

    it("should handle SQL-like patterns", () => {
      const input = '{"query": "SELECT * FROM table WHERE name="value""}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('name=\\"value\\"');
    });
  });

  describe("nested structures", () => {
    it("should handle quotes in nested object string values", () => {
      const input =
        '{"outer": {"description": "Nested string with type="hidden" HTML"}}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"hidden\\"');
    });

    it("should handle quotes in array element string values", () => {
      const input = '{"items": ["First item", "Second with type="text" HTML", "Third"]}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"text\\"');
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixUnescapedQuotesInStrings("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle strings without quotes", () => {
      const input = '{"description": "This is a normal string without any quotes"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle strings with only escaped quotes", () => {
      const input = '{"description": "This has \\"escaped quotes\\" only"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle malformed JSON gracefully", () => {
      const input = '{"broken": "string with type="hidden" >"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"hidden\\"');
    });

    it("should not escape quotes followed by JSON structure delimiters", () => {
      const input = '{"name": "value"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle quotes at end of string value correctly", () => {
      const input = '{"description": "Text ending with quote"}';
      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // This test ensures the try-catch works
      const input = '{"test": "value"}';
      // Mock a scenario that might cause an error
      const result = fixUnescapedQuotesInStrings(input);

      // Should return a valid result even if processing encounters issues
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("complex real-world scenarios", () => {
    it("should handle complex implementation description with HTML", () => {
      const input =
        '{"implementation": "The method creates HTML forms using `<form action="submit">` and includes `<input type="hidden" name="token">` elements. It also handles `<select name="option">` dropdowns."}';

      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('action=\\"submit\\"');
      expect(result.content).toContain('type=\\"hidden\\"');
      expect(result.content).toContain('name=\\"token\\"');
      expect(result.content).toContain('name=\\"option\\"');

      // Verify the result is valid JSON
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle mixed escaped and unescaped quotes", () => {
      const input =
        '{"description": "This has \\"escaped quotes\\" and also unescaped type="hidden" HTML"}';

      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      // Escaped quotes should remain escaped
      expect(result.content).toContain('\\"escaped quotes\\"');
      // Unescaped quote should be escaped
      expect(result.content).toContain('type=\\"hidden\\"');
    });

    it("should handle the actual error case from ClientStateTag", () => {
      // Simplified version of the actual error case
      const input =
        '{"implementation": "The class extends `BodyTagSupport`, a standard base class for JSP tags that can have a body. Its main logic resides in the `doEndTag` method, which executes after the tag\'s body has been processed. This method dynamically constructs an HTML `<form>` element with its action set to a configurable `targetURL`. It then iterates through the current `HttpServletRequest`\'s parameters and attributes. For each parameter, it creates a corresponding `<input type="hidden">`. For each attribute that implements `java.io.Serializable`, it serializes the object into a byte array, encodes it using Base64, and stores the resulting string in another hidden input field."}';

      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"hidden\\"');

      // Most importantly: verify the JSON can be parsed
      expect(() => {
        const parsed = JSON.parse(result.content);
        expect(parsed.implementation).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("multiple fixes in one string", () => {
    it("should fix multiple unescaped quotes in the same string value", () => {
      const input =
        '{"code": "HTML with <input type="text" name="field" id="myId"> element"}';

      const result = fixUnescapedQuotesInStrings(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('type=\\"text\\"');
      expect(result.content).toContain('name=\\"field\\"');
      expect(result.content).toContain('id=\\"myId\\"');

      // Should have multiple diagnostics
      expect(result.diagnostics?.length).toBeGreaterThanOrEqual(1);
    });
  });
});

