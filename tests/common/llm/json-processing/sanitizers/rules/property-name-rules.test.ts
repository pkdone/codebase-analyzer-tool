/**
 * Tests for property name replacement rules.
 * Tests both default behavior and schema-aware inference.
 *
 * Note: When multiple rules are executed together, earlier rules may
 * transform the input before later rules can match. For example,
 * missingOpeningQuoteOnProperty may add quotes before truncatedPropertyName can fire.
 */

import { PROPERTY_NAME_RULES } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/property-name-rules";
import { executeRules } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";

describe("PROPERTY_NAME_RULES", () => {
  describe("missing opening quote fixes", () => {
    it("should fix property names with missing opening quotes", () => {
      // se" is a truncated property name - this tests the missingOpeningQuoteOnProperty rule
      const input =
        '{"first": "value1",\nse": "This test validates the behavior of truncated props"}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      // The rule adds the missing opening quote, resulting in "se"
      expect(result.content).toContain('"se":');
    });

    it("should pass config to rules for schema-aware processing", () => {
      // When config is provided, it's available to rules for inference
      const input =
        '{"first": "value",\npurpose": "Explains how the component works with other systems"}';
      const result = executeRules(input, PROPERTY_NAME_RULES, {
        config: {
          knownProperties: ["name", "purpose", "description", "implementation"],
        },
      });

      expect(result.changed).toBe(true);
      // The missingOpeningQuoteOnProperty rule adds the opening quote
      expect(result.content).toContain('"purpose":');
    });
  });

  describe("missingPropertyNameBeforeColon rule", () => {
    it("should fix missing property name with default inference", () => {
      const input = '{\n  ": "A value that needs a property name before it"\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name":');
    });
  });

  describe("propertyNameWithEmbeddedValue rule", () => {
    it("should fix property with embedded value for common property names", () => {
      const input = '{"name payLoanCharge": "payLoanCharge"}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "payLoanCharge"}');
    });

    it("should fix property with embedded value for schema-provided names", () => {
      const input = '{"customField myValue": "myValue"}';
      const result = executeRules(input, PROPERTY_NAME_RULES, {
        config: {
          knownProperties: ["customField", "otherField"],
        },
      });

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"customField": "myValue"}');
    });

    it("should NOT fix property when property name is not known", () => {
      const input = '{"unknownProp someText": "someText"}';
      const result = executeRules(input, PROPERTY_NAME_RULES, {
        config: {
          knownProperties: ["name", "type"],
        },
      });

      // unknownProp is not in the schema, so the rule should skip this
      expect(result.changed).toBe(false);
    });
  });

  describe("typeWithEmbeddedWord rule", () => {
    it("should fix type property with embedded word", () => {
      const input = '{"type savory": "SavingsInterestCalculationType"}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "SavingsInterestCalculationType"}');
    });

    it("should fix schema-provided property with embedded word", () => {
      const input = '{"category other": "CategoryValue"}';
      const result = executeRules(input, PROPERTY_NAME_RULES, {
        config: {
          knownProperties: ["category", "subcategory"],
        },
      });

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"category": "CategoryValue"}');
    });

    it("should NOT fix unknown property with embedded word", () => {
      const input = '{"random extra": "SomeValue"}';
      const result = executeRules(input, PROPERTY_NAME_RULES, {
        config: {
          knownProperties: ["name", "type"],
        },
      });

      expect(result.changed).toBe(false);
    });
  });

  describe("corruptedPropertyNameExtraText rule", () => {
    it("should fix corrupted property name with extra text", () => {
      const input = '{"name":g": ,}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      // The rule preserves the terminator which includes the space
      expect(result.content).toBe('{"name": ,}');
    });
  });

  describe("missingQuotesOnPropertyWithArrayObject rule", () => {
    it("should fix missing quotes on property with array value", () => {
      const input = '{\n  items: ["value1", "value2"]\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"items":');
    });

    it("should fix missing quotes on property with object value", () => {
      const input = '{\n  nested: {"key": "value"}\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"nested":');
    });
  });

  describe("missingOpeningQuoteOnProperty rule", () => {
    it('should fix property like name": to "name":', () => {
      const input = '{\n  name": "value"\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name":');
    });
  });

  describe("duplicatePropertyName rule", () => {
    it("should fix duplicate property names", () => {
      const input = '{"purpose": "purpose": "value"}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"purpose": "value"}');
    });
  });

  describe("dashBeforePropertyName rule", () => {
    it("should remove dash before property name", () => {
      const input = '{\n  - "externalReferences": []\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).not.toContain("- ");
    });
  });

  describe("nonAsciiQuoteBeforeProperty rule", () => {
    it("should fix non-ASCII quote before property", () => {
      const input = '{\n  \u02BBlinesOfCode": 3\n}';
      const result = executeRules(input, PROPERTY_NAME_RULES);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"linesOfCode":');
    });
  });
});
