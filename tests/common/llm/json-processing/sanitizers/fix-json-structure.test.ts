import { fixJsonStructure } from "../../../../../src/common/llm/json-processing/sanitizers/index";

describe("fixJsonStructure", () => {
  describe("post-processing fixes", () => {
    it("should fix dangling properties", () => {
      const input = '{"propertyName "}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"propertyName": null');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quotes in array strings", () => {
      const input = '["item1", item2", "item3"]';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"item2"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove stray characters after property values", () => {
      const input = '{"key": "value"extra}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix corrupted property/value pairs", () => {
      const input = '{"name":ICCID": "value"}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should return unchanged for valid JSON", () => {
      const input = '{"key": "value"}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixJsonStructure("");
      expect(result.changed).toBe(false);
    });

    it("should provide diagnostics when changes are made", () => {
      const input = '{"propertyName "}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.repairs).toBeDefined();
      expect(result.repairs?.length).toBeGreaterThan(0);
    });
  });
});
