/**
 * Tests for the property name fixer strategy.
 */

import { propertyNameFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/property-name-fixer";

describe("propertyNameFixer", () => {
  it("should return unchanged for empty input", () => {
    const result = propertyNameFixer.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON", () => {
    const input = '{"name": "test", "value": 123}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should fix property name with missing opening quote", () => {
    const input = '{name": "test"}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toBe('{"name": "test"}');
    expect(result.changed).toBe(true);
  });

  it("should fix completely unquoted property names", () => {
    const input = '{\n  name: "test"\n}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toContain('"name":');
    expect(result.changed).toBe(true);
  });

  it("should fix property names with trailing underscore", () => {
    const input = '{"name_": "test"}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toBe('{"name": "test"}');
    expect(result.changed).toBe(true);
  });

  it("should fix double underscores in property names", () => {
    const input = '{"name__value": "test"}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toBe('{"name_value": "test"}');
    expect(result.changed).toBe(true);
  });

  it("should use property name mappings from config", () => {
    const input = '{"nm": "test"}';
    const config = {
      propertyNameMappings: { nm: "name" },
    };
    const result = propertyNameFixer.apply(input, config);
    expect(result.content).toContain('"name"');
  });

  it("should use typo corrections from config", () => {
    const input = '{"naem": "test"}';
    const config = {
      propertyTypoCorrections: { naem: "name" },
    };
    const result = propertyNameFixer.apply(input, config);
    expect(result.content).toBe('{"name": "test"}');
    expect(result.changed).toBe(true);
  });

  it("should fix concatenated property names", () => {
    const input = '{"first" + "Second": "value"}';
    const result = propertyNameFixer.apply(input);
    expect(result.content).toBe('{"firstSecond": "value"}');
    expect(result.changed).toBe(true);
  });

  it("should add diagnostics for changes", () => {
    const input = '{name": "test"}';
    const result = propertyNameFixer.apply(input);
    expect(result.repairs.length).toBeGreaterThan(0);
  });

  describe("single-quoted and backticked property names", () => {
    it("should fix single-quoted property names", () => {
      const input = "{'name': \"test\"}";
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"name": "test"}');
      expect(result.changed).toBe(true);
    });

    it("should fix backticked property names", () => {
      const input = '{`name`: "test"}';
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"name": "test"}');
      expect(result.changed).toBe(true);
    });

    it("should fix single-quoted property names after comma", () => {
      const input = "{\"first\": 1, 'second': 2}";
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"first": 1, "second": 2}');
      expect(result.changed).toBe(true);
    });

    it("should fix backticked property names after newline", () => {
      const input = '{\n  `name`: "test"\n}';
      const result = propertyNameFixer.apply(input);
      expect(result.content).toContain('"name":');
      expect(result.changed).toBe(true);
    });

    it("should not fix single-quoted JSON keywords", () => {
      // JSON keywords like true, false, null should not be converted to property names
      const input = '{"valid": \'true\': "value"}';
      // This pattern won't match because 'true' isn't followed by : in the right context
      const result = propertyNameFixer.apply(input);
      // The input is malformed, but the keyword shouldn't become a property name
      expect(result.content).not.toContain('"true": "value"');
    });

    it("should add diagnostics for single-quoted fixes", () => {
      const input = "{'name': \"test\"}";
      const result = propertyNameFixer.apply(input);
      expect(result.repairs.some((d) => d.includes("single-quoted"))).toBe(true);
    });

    it("should add diagnostics for backticked fixes", () => {
      const input = '{`name`: "test"}';
      const result = propertyNameFixer.apply(input);
      expect(result.repairs.some((d) => d.includes("backticked"))).toBe(true);
    });

    it("should handle mixed quote styles", () => {
      const input = "{\"first\": 1, 'second': 2, `third`: 3}";
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"first": 1, "second": 2, "third": 3}');
      expect(result.changed).toBe(true);
    });

    it("should fix property names with dots using alternate quotes", () => {
      const input = "{'my.property': \"value\"}";
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"my.property": "value"}');
      expect(result.changed).toBe(true);
    });

    it("should fix property names with underscores using alternate quotes", () => {
      const input = '{`my_property`: "value"}';
      const result = propertyNameFixer.apply(input);
      expect(result.content).toBe('{"my_property": "value"}');
      expect(result.changed).toBe(true);
    });
  });
});
