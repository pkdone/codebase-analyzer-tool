import { unwrapJsonSchemaStructure } from "../../../src/llm/json-processing/utils/post-parse-transforms";

describe("post-parse transforms", () => {
  describe("unwrapJsonSchemaStructure", () => {
    describe("when given a JSON Schema structure", () => {
      it("unwraps JSON Schema with type and properties", () => {
        const input = {
          type: "object",
          properties: {
            purpose: "This is the purpose",
            implementation: "This is the implementation",
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toEqual({
          purpose: "This is the purpose",
          implementation: "This is the implementation",
        });
      });

      it("unwraps the exact structure from the error log", () => {
        const input = {
          type: "object",
          properties: {
            purpose:
              "This file serves as a template for generating post-release cleanup instructions for the Apache Fineract project.",
            implementation:
              "The file is implemented as a FreeMarker template (.ftl) that uses variable substitution.",
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toEqual({
          purpose:
            "This file serves as a template for generating post-release cleanup instructions for the Apache Fineract project.",
          implementation:
            "The file is implemented as a FreeMarker template (.ftl) that uses variable substitution.",
        });
      });

      it("unwraps JSON Schema with nested object properties", () => {
        const input = {
          type: "object",
          properties: {
            user: {
              name: "John",
              age: 30,
            },
            metadata: {
              timestamp: "2025-10-03",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toEqual({
          user: {
            name: "John",
            age: 30,
          },
          metadata: {
            timestamp: "2025-10-03",
          },
        });
      });

      it("unwraps JSON Schema with array properties", () => {
        const input = {
          type: "object",
          properties: {
            items: [1, 2, 3],
            tags: ["tag1", "tag2"],
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toEqual({
          items: [1, 2, 3],
          tags: ["tag1", "tag2"],
        });
      });

      it("unwraps JSON Schema with additional metadata fields", () => {
        const input = {
          type: "object",
          description: "This is a schema description",
          required: ["field1", "field2"],
          properties: {
            field1: "value1",
            field2: "value2",
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toEqual({
          field1: "value1",
          field2: "value2",
        });
      });
    });

    describe("edge cases that should not be transformed", () => {
      it("leaves valid data object unchanged", () => {
        const input = {
          purpose: "This is the purpose",
          implementation: "This is the implementation",
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input); // Should return the same object reference
      });

      it("leaves object without type field unchanged", () => {
        const input = {
          properties: {
            field: "value",
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves object without properties field unchanged", () => {
        const input = {
          type: "object",
          field: "value",
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves JSON Schema with type other than object unchanged", () => {
        const input = {
          type: "string",
          properties: {
            field: "value",
          },
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves object with empty properties unchanged", () => {
        const input = {
          type: "object",
          properties: {},
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves object with null properties unchanged", () => {
        const input = {
          type: "object",
          properties: null,
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves object with array properties unchanged", () => {
        const input = {
          type: "object",
          properties: [1, 2, 3],
        };

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves array unchanged", () => {
        const input = [{ field: "value" }];

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves string unchanged", () => {
        const input = "This is a string";

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves number unchanged", () => {
        const input = 42;

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves null unchanged", () => {
        const input = null;

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });

      it("leaves undefined unchanged", () => {
        const input = undefined;

        const result = unwrapJsonSchemaStructure(input);

        expect(result).toBe(input);
      });
    });
  });
});
