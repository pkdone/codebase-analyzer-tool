import {
  executeRulesMultiPass,
  STRUCTURAL_RULES,
  ALL_RULES,
} from "../../../../../../src/common/llm/json-processing/sanitizers/rules";
import { parseJsonWithSanitizers } from "../../../../../../src/common/llm/json-processing/core/json-parsing";
import { fixJsonStructureAndNoise } from "../../../../../../src/common/llm/json-processing/sanitizers/structural-sanitizer";

describe("unclosedArrayBeforeProperty rule", () => {
  describe("STRUCTURAL_RULES", () => {
    it("should fix missing closing bracket for parameters array before returnType", () => {
      const input = `{
  "name": "TestClass",
  "publicFunctions": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name": "entity",
          "type": "String"
        },
      "returnType": "void",
      "description": "Test method"
    }
  ]
}`;

      const result = executeRulesMultiPass(input, STRUCTURAL_RULES, { maxPasses: 5 });

      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.changed).toBe(true);
    });

    it("should fix missing closing bracket with ALL_RULES", () => {
      const input = `{
  "name": "TestClass",
  "publicFunctions": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name": "entity",
          "type": "String"
        },
      "returnType": "void",
      "description": "Test method"
    }
  ]
}`;

      const result = executeRulesMultiPass(input, ALL_RULES, { maxPasses: 5 });

      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.changed).toBe(true);
    });
  });

  describe("fixJsonStructureAndNoise (early phase fix)", () => {
    it("should fix unclosed array before property in Phase 1", () => {
      const input = `{
  "name": "TestClass",
  "publicFunctions": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name": "entity",
          "type": "String"
        },
      "returnType": "void"
    }
  ]
}`;

      const result = fixJsonStructureAndNoise(input);

      expect(result.changed).toBe(true);
      expect(result.repairs).toContain("Fixed unclosed array before property name");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix nested unclosed arrays", () => {
      const input = `{
  "methods": [
    {
      "name": "method1",
      "parameters": [
        {"name": "p1", "type": "String"},
      "returnType": "void"
    },
    {
      "name": "method2",
      "parameters": [
        {"name": "p2", "type": "int"},
      "returnType": "int"
    }
  ]
}`;

      const result = fixJsonStructureAndNoise(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not modify valid JSON with properly closed arrays", () => {
      const input = `{
  "name": "TestClass",
  "parameters": [
    {"name": "param1", "type": "String"}
  ],
  "returnType": "void"
}`;

      const result = fixJsonStructureAndNoise(input);

      // Should not change valid JSON
      expect(result.changed).toBe(false);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("parseJsonWithSanitizers (full pipeline)", () => {
    it("should fix unclosed array through full sanitization pipeline", () => {
      // Exact reproduction of the error log pattern from ClientAddressReadPlatformServiceImpl.java
      const input = `{
  "name": "ClientAddressReadPlatformServiceImpl",
  "kind": "CLASS",
  "publicFunctions": [
    {
      "name": "retrieveClientAddrConfiguration",
      "purpose": "Test purpose",
      "parameters": [
        {
          "name": "entity",
          "type": "String"
        },
      "returnType": "Collection<ClientAddressData>",
      "description": "The method description.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 6,
      "codeSmells": []
    }
  ]
}`;

      const result = parseJsonWithSanitizers(input);

      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data as { publicFunctions: { name: string }[] };
        expect(parsed.publicFunctions[0].name).toBe("retrieveClientAddrConfiguration");
      }
    });

    it("should fix pattern from CustomJobParameterNotFoundException error log", () => {
      const input = `{
  "name": "CustomJobParameterNotFoundException",
  "kind": "CLASS",
  "publicFunctions": [
    {
      "name": "CustomJobParameterNotFoundException",
      "purpose": "Constructor that creates exception with Long ID",
      "parameters": [
        {
          "name": "customJobParameterId",
          "type": "Long"
        },
      "returnType": "void",
      "cyclomaticComplexity": 1
    }
  ]
}`;

      const result = parseJsonWithSanitizers(input);

      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data as { publicFunctions: { name: string }[] };
        expect(parsed.publicFunctions[0].name).toBe("CustomJobParameterNotFoundException");
      }
    });

    it("should fix pattern from ResourceNotFoundException error log", () => {
      const input = `{
  "name": "ResourceNotFoundException",
  "kind": "CLASS",
  "publicFunctions": [
    {
      "name": "ResourceNotFoundException",
      "purpose": "Constructor that wraps BeansException",
      "parameters": [
        {
          "name": "e",
          "type": "BeansException"
        },
      "returnType": "void",
      "cyclomaticComplexity": 1
    }
  ]
}`;

      const result = parseJsonWithSanitizers(input);

      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data as { publicFunctions: { name: string }[] };
        expect(parsed.publicFunctions[0].name).toBe("ResourceNotFoundException");
      }
    });
  });
});
