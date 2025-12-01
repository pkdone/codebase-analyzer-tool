import { fixHeuristicJsonErrors } from "../../../../src/llm/json-processing/sanitizers/index.js";

describe("fixHeuristicJsonErrors", () => {
  describe("Pattern 3: Text appearing outside string values", () => {
    it("should remove descriptive text after string value with punctuation", () => {
      const input = `{
  "externalReferences": [
    "java.util.Map",
 tribulations.
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"java.util.Map"');
      // The pattern should attempt to fix it - if changed, verify it's closer to valid
      if (result.changed) {
        expect(result.content).not.toContain("tribulations");
      }
    });

    it("should remove descriptive text after string value", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
from the API layer
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
      );
      expect(result.content).not.toContain("from the API layer");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 4d: _llm_thought text after JSON structure", () => {
    it("should remove _llm_thought text appearing after closing brace", () => {
      const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}
_llm_thought: The user wants me to act as a senior developer and analyze the provided Java code.`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"kind": "CLASS"\n}');
      expect(result.content).not.toContain("_llm_thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 4e: Text before property after closing brace", () => {
    it("should remove stray text 'so' before property after closing brace", () => {
      const input = `{
  "databaseIntegration": {
    "tablesAccessed": []
  },
so    "connectionInfo": "n/a"
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"connectionInfo": "n/a"');
      expect(result.content).not.toContain('so    "connectionInfo"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});
