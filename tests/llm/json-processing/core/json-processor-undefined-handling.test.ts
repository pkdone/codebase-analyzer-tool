import { JsonProcessor } from "../../../../src/llm/json-processing/core/json-processor";
import { LLMCompletionOptions, LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { z } from "zod";

describe("JsonProcessor - Undefined Value Handling Integration", () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor(false); // Disable logging for tests
  });

  describe("undefined value sanitization", () => {
    it("should successfully parse JSON with undefined values", () => {
      const llmResponse = `{
  "purpose": "This XML file serves as an EJB 2.0 deployment descriptor",
  "implementation": "The implementation defines an entity bean",
  "uiFramework": undefined
}`;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(llmResponse, "ejb-jar.xml", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("This XML file serves as an EJB 2.0 deployment descriptor");
        expect(data.implementation).toBe("The implementation defines an entity bean");
        expect("uiFramework" in data).toBe(false); // Converted from undefined -> null -> omitted
      }
    });

    it("should handle multiple undefined values in complex structure", () => {
      const llmResponse = `{
  "name": "TestComponent",
  "kind": "class",
  "namespace": "com.example",
  "purpose": "Test purpose",
  "implementation": "Test implementation",
  "internalReferences": undefined,
  "externalReferences": undefined,
  "databaseIntegration": {
    "mechanism": "NONE",
    "description": "No database integration",
    "codeExample": undefined
  }
}`;

      const schema = z.object({
        name: z.string(),
        kind: z.string(),
        namespace: z.string(),
        purpose: z.string(),
        implementation: z.string(),
        internalReferences: z.array(z.string()).optional(),
        externalReferences: z.array(z.string()).optional(),
        databaseIntegration: z.object({
          mechanism: z.string(),
          description: z.string(),
          codeExample: z.string().optional(),
        }),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(llmResponse, "test-component", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.name).toBe("TestComponent");
        expect("internalReferences" in data).toBe(false);
        expect("externalReferences" in data).toBe(false);
        expect("codeExample" in (data.databaseIntegration as Record<string, unknown>)).toBe(false);
      }
    });

    it("should handle undefined values in arrays", () => {
      const llmResponse = `[
  {"name": "item1", "optional": undefined},
  {"name": "item2", "optional": "value"},
  {"name": "item3", "optional": undefined}
]`;

      const schema = z.array(
        z.object({
          name: z.string(),
          optional: z.string().optional(),
        }),
      );

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(llmResponse, "array-test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as unknown as Record<string, unknown>[];
        expect(data).toHaveLength(3);
        expect("optional" in data[0]).toBe(false);
        expect(data[1].optional).toBe("value");
        expect("optional" in data[2]).toBe(false);
      }
    });
  });

  describe("error prevention", () => {
    it("should prevent the exact error from the log", () => {
      // This is the exact problematic response from the error log
      const problematicResponse = `{
  "purpose": "This XML file serves as an EJB 2.0 deployment descriptor for an Address entity bean component within a J2EE application. It defines the configuration and metadata for the AddressEJB entity bean, which represents address information in a persistent data store. The file specifies how the EJB container should manage the bean's lifecycle, persistence, security, and transactional behavior. This deployment descriptor is part of the Sun Microsystems J2EE Blueprints sample application and provides the necessary configuration for the container to properly deploy and manage the Address entity bean.",
  "implementation": "The implementation defines an entity bean named AddressEJB using Container-Managed Persistence (CMP) version 2.x, which means the EJB container handles all database operations automatically. The bean manages six container-managed persistent fields: zipCode, streetName1, streetName2, city, state, and country, representing a complete mailing address structure. The configuration specifies local interfaces only (AddressLocalHome and AddressLocal), indicating this bean is designed for local access within the same JVM rather than remote invocation. The assembly descriptor section establishes comprehensive security and transaction policies, granting unchecked access to all methods while requiring transactional context for all business operations through the Required transaction attribute. Multiple create methods are defined in the method permissions, allowing the bean to be instantiated with no parameters, with all six address fields, or with an Address data transfer object, providing flexibility in how address entities are created within the application.",
  "uiFramework": undefined
}`;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(
        problematicResponse,
        "ejb-jar.xml",
        completionOptions,
      );

      // Should now succeed instead of failing with parse error
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toContain("EJB 2.0 deployment descriptor");
        expect(data.implementation).toContain("AddressEJB");
        expect("uiFramework" in data).toBe(false);
      }
    });

    it("should handle undefined values with code fences", () => {
      const llmResponse = `\`\`\`json
{
  "purpose": "Test purpose",
  "implementation": "Test implementation",
  "uiFramework": undefined
}
\`\`\``;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(llmResponse, "fenced-test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("Test purpose");
        expect(data.implementation).toBe("Test implementation");
        expect("uiFramework" in data).toBe(false);
      }
    });

    it("should handle undefined values with unquoted property names", () => {
      const llmResponse = `{
  purpose: "Test purpose",
  implementation: "Test implementation",
  uiFramework: undefined
}`;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(llmResponse, "unquoted-test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("Test purpose");
        expect(data.implementation).toBe("Test implementation");
        expect("uiFramework" in data).toBe(false);
      }
    });
  });

  describe("sanitization pipeline integration", () => {
    it("should apply multiple sanitizers in correct order", () => {
      const llmResponse = `\`\`\`json
{
  purpose: "Test purpose",
  implementation: "Test implementation",
  uiFramework: undefined,
  extraField: undefined
}
\`\`\``;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
        extraField: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(
        llmResponse,
        "multi-sanitizer-test",
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("Test purpose");
        expect(data.implementation).toBe("Test implementation");
        expect("uiFramework" in data).toBe(false);
        expect("extraField" in data).toBe(false);

        // Verify that sanitization steps were applied
        expect(result.steps).toContain("Removed code fences");
        expect(result.steps).toContain("Fixed unquoted property names");
        expect(result.steps).toContain("Fixed undefined values");
      }
    });

    it("should handle complex nested undefined values", () => {
      const llmResponse = `{
  "level1": {
    "value": "present",
    "undefinedValue": undefined,
    "level2": {
      "items": [
        {"id": 1, "optional": undefined},
        {"id": 2, "optional": "value"}
      ],
      "metadata": undefined
    }
  },
  "topLevelUndefined": undefined
}`;

      const schema = z.object({
        level1: z.object({
          value: z.string(),
          undefinedValue: z.string().optional(),
          level2: z.object({
            items: z.array(
              z.object({
                id: z.number(),
                optional: z.string().optional(),
              }),
            ),
            metadata: z.string().optional(),
          }),
        }),
        topLevelUndefined: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(
        llmResponse,
        "nested-undefined-test",
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        const level1 = data.level1 as Record<string, unknown>;

        expect(level1.value).toBe("present");
        expect("undefinedValue" in level1).toBe(false);
        expect("topLevelUndefined" in data).toBe(false);

        const level2 = level1.level2 as Record<string, unknown>;
        const items = level2.items as Record<string, unknown>[];

        expect("optional" in items[0]).toBe(false);
        expect(items[1].optional).toBe("value");
        expect("metadata" in level2).toBe(false);
      }
    });
  });

  describe("backwards compatibility", () => {
    it("should still work correctly when undefined is not present", () => {
      const response = `{
  "purpose": "Test purpose",
  "implementation": "Test implementation"
}`;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(response, "no-undefined-test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("Test purpose");
        expect(data.implementation).toBe("Test implementation");
        expect("uiFramework" in data).toBe(false);
      }
    });

    it("should still work when optional fields are omitted entirely", () => {
      const response = `{
  "purpose": "Test purpose",
  "implementation": "Test implementation"
}`;

      const schema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        uiFramework: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(response, "omitted-test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.purpose).toBe("Test purpose");
        expect(data.implementation).toBe("Test implementation");
        expect("uiFramework" in data).toBe(false);
      }
    });
  });
});
