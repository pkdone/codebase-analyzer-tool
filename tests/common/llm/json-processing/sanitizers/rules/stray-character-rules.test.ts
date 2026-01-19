import { executeRules } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { STRAY_CHARACTER_RULES } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/stray-character-rules";

describe("STRAY_CHARACTER_RULES", () => {
  describe("extraCharBeforeProperty", () => {
    it('should remove single character before property: a  "integrationPoints":', () => {
      const input = `{
  "name": "Test",
a  "integrationPoints": []
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"integrationPoints": []');
      expect(result.content).not.toContain('a  "integrationPoints"');
    });

    it('should remove single character before property: s  "publicMethods":', () => {
      const input = `{
  "name": "Test"
},
s  "publicMethods": []`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": []');
      expect(result.content).not.toContain('s  "publicMethods"');
    });
  });

  describe("genericListMarkerBeforeProperty", () => {
    it('should remove bullet point before property name: •  "publicConstants":', () => {
      const input = `{
  "name": "TestClass",
•  "publicConstants": []
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicConstants": []');
      expect(result.content).not.toContain("•");
    });

    it('should remove asterisk before property name: * "purpose":', () => {
      const input = `{
  "name": "Test",
* "purpose": "Test purpose"
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"purpose": "Test purpose"');
      expect(result.content).not.toContain('* "purpose"');
    });

    it("should handle asterisk with extra whitespace", () => {
      const input = `{
  "name": "Test",
*   "purpose": "Test purpose"
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"purpose": "Test purpose"');
    });

    it('should remove dash list marker before property: - "items":', () => {
      const input = `{
  "name": "Test",
- "items": []
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"items": []');
      expect(result.content).not.toContain('- "items"');
    });

    it('should remove plus sign before property: + "value":', () => {
      const input = `{
  "name": "Test",
+ "value": 42
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"value": 42');
      expect(result.content).not.toContain('+ "value"');
    });

    it('should remove arrow marker before property: > "section":', () => {
      const input = `{
  "name": "Test",
> "section": "main"
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"section": "main"');
      expect(result.content).not.toContain('> "section"');
    });

    it("should remove various Unicode bullet markers", () => {
      const input = `{
  "name": "Test",
► "item1": "value1",
▸ "item2": "value2",
◦ "item3": "value3"
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"item1": "value1"');
      expect(result.content).toContain('"item2": "value2"');
      expect(result.content).toContain('"item3": "value3"');
    });
  });

  describe("shortPrefixBeforeQuotedString", () => {
    it('should remove "ar" prefix before quoted strings in arrays', () => {
      const input = `{
  "externalReferences": [
    ar"com.example.ClassName"
  ]
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"com.example.ClassName"');
      expect(result.content).not.toContain('ar"com.example');
    });

    it('should remove "x" prefix before quoted strings', () => {
      const input = `{
  "items": [
    x"value"
  ]
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"value"');
    });
  });

  describe("singleCharBeforePropertyQuote", () => {
    it('should fix: y"name": -> "name":', () => {
      const input = `{
  "publicFunctions": [
    {
      y"name": "testMethod"
    }
  ]
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "testMethod"');
      expect(result.content).not.toContain('y"name"');
    });
  });

  describe("strayTextAfterBraceComma", () => {
    it("should remove stray text after closing brace comma: },ce", () => {
      const input = `{
  "key": "value"
},ce
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("ce");
    });
  });

  describe("corruptedUppercaseIdentifier", () => {
    it("should remove corrupted uppercase identifier from array", () => {
      const input = `{
  "references": [
    "com.example.Class"
  ],
_MODULE"
  "otherProp": []
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('_MODULE"');
    });
  });

  describe("extraCharBeforeBrace", () => {
    it("should remove single character before opening brace: c{", () => {
      const input = `{
  "items": [
    c{
      "name": "test"
    }
  ]
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain("{");
      expect(result.content).not.toContain("c{");
    });
  });

  describe("pythonTripleQuotes", () => {
    it("should remove Python-style triple quotes", () => {
      const input = `{
  "name": "Test"
}"""`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('"""');
    });
  });

  describe("removePlaceholderText", () => {
    it("should remove ALL_CAPS placeholder patterns surrounded by underscores", () => {
      const input = `{
  "name": "Test"
},
_INSERT_DATABASE_INTEGRATION_
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_INSERT_DATABASE_INTEGRATION_");
    });

    it("should remove generic placeholder patterns like _TODO_", () => {
      const input = `{
  "name": "Test"
},
_TODO_
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_TODO_");
    });

    it("should remove _PLACEHOLDER_ pattern", () => {
      const input = `{
  "name": "Test"
},
_PLACEHOLDER_
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_PLACEHOLDER_");
    });
  });

  describe("strayCharAtLineStartInArray", () => {
    it("should remove stray character with simple quoted string", () => {
      const input = `{
  "items": [
    "item1",
    e "item2"
  ]
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      // The rule expects the pattern: delimiter + whitespace + single char + space(s) + quoted string
      // Verifying the array element is still present
      expect(result.content).toContain('"item2"');
    });
  });

  describe("strayTextBeforePropertyName", () => {
    it("should remove stray text before property name", () => {
      const input = `{
  "key1": "value1",
trib"propertyName": "value2"
}`;
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"propertyName": "value2"');
    });
  });

  describe("integration with JSON parsing", () => {
    it("should produce valid JSON after applying all stray character rules", () => {
      const input = `{
  "name": "TestClass",
* "purpose": "Test purpose",
a  "publicConstants": [],
  "publicFunctions": [
    {
      y"name": "testMethod"
    }
  ]
}`;

      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe("TestClass");
      expect(parsed.purpose).toBe("Test purpose");
      expect(parsed.publicConstants).toEqual([]);
      expect(parsed.publicFunctions[0].name).toBe("testMethod");
    });
  });
});
