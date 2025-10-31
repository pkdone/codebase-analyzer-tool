import { sanitizeVertexAISchema } from "../../../../../src/llm/providers/vertexai/vertex-ai-gemini/vertex-ai-gemini-llm";

describe("sanitizeVertexAISchema", () => {
  describe("basic const field removal", () => {
    it("should remove top-level const field", () => {
      const schema = {
        type: "string",
        const: "fixed-value",
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({ type: "string" });
      expect(result).not.toHaveProperty("const");
    });

    it("should preserve other fields when removing const", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        const: "should-be-removed",
        description: "Test schema",
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
        },
        description: "Test schema",
      });
      expect(result).not.toHaveProperty("const");
    });
  });

  describe("nested object const removal", () => {
    it("should remove const from nested properties", () => {
      const schema = {
        type: "object",
        properties: {
          status: {
            type: "string",
            const: "active",
          },
          name: {
            type: "string",
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({
        type: "object",
        properties: {
          status: {
            type: "string",
          },
          name: {
            type: "string",
          },
        },
      });
      expect((result as any).properties.status).not.toHaveProperty("const");
    });

    it("should remove const from deeply nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              profile: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    const: "admin",
                  },
                },
              },
            },
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const user = (result as any).properties.user;
      const profile = user.properties.profile;
      const role = profile.properties.role;
      expect(role).toEqual({ type: "string" });
      expect(role).not.toHaveProperty("const");
    });
  });

  describe("array const removal", () => {
    it("should remove const from array items", () => {
      const schema = {
        type: "array",
        items: {
          type: "string",
          const: "item-value",
        },
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({
        type: "array",
        items: {
          type: "string",
        },
      });
      expect((result as any).items).not.toHaveProperty("const");
    });

    it("should handle arrays of objects with const", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            type: { type: "string", const: "user" },
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const items = (result as any).items;
      expect(items.properties.type).toEqual({ type: "string" });
      expect(items.properties.type).not.toHaveProperty("const");
    });
  });

  describe("anyOf/allOf const removal", () => {
    it("should remove const from anyOf schemas", () => {
      const schema = {
        type: "object",
        properties: {
          value: {
            anyOf: [{ type: "string" }, { type: "number", const: 42 }],
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const anyOf = (result as any).properties.value.anyOf;
      expect(anyOf[0]).toEqual({ type: "string" });
      expect(anyOf[1]).toEqual({ type: "number" });
      expect(anyOf[1]).not.toHaveProperty("const");
    });

    it("should remove const from allOf schemas", () => {
      const schema = {
        type: "object",
        properties: {
          config: {
            allOf: [
              { type: "object", properties: { name: { type: "string" } } },
              { type: "object", properties: { mode: { type: "string", const: "strict" } } },
            ],
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const allOf = (result as any).properties.config.allOf;
      expect(allOf[1].properties.mode).toEqual({ type: "string" });
      expect(allOf[1].properties.mode).not.toHaveProperty("const");
    });

    it("should handle deeply nested anyOf within items", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                anyOf: [{ type: "string" }, { type: "number", const: 0 }],
              },
            },
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const nestedItems = (result as any).items.properties.items.items;
      const anyOf = nestedItems.anyOf;
      expect(anyOf[1]).toEqual({ type: "number" });
      expect(anyOf[1]).not.toHaveProperty("const");
    });
  });

  describe("complex nested structures", () => {
    it("should handle multiple const fields at different nesting levels", () => {
      const schema = {
        type: "object",
        const: "root-const",
        properties: {
          prop1: {
            type: "string",
            const: "prop1-const",
          },
          prop2: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nested: {
                  type: "string",
                  const: "nested-const",
                  anyOf: [{ type: "string" }, { type: "number", const: 123 }],
                },
              },
            },
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).not.toHaveProperty("const");
      expect((result as any).properties.prop1).not.toHaveProperty("const");
      const nested = (result as any).properties.prop2.items.properties.nested;
      expect(nested).not.toHaveProperty("const");
      expect(nested.anyOf[1]).not.toHaveProperty("const");
    });

    it("should match the error scenarios from the actual error messages", () => {
      // This schema mimics the structure that caused the original error
      const schema = {
        type: "object",
        properties: {
          "1": {
            value: {
              anyOf: [
                { type: "string" },
                { const: "some-value" }, // This caused the error
              ],
            },
          },
          "8": {
            value: {
              items: {
                properties: {
                  "7": {
                    value: {
                      allOf: [
                        { type: "object" },
                        {
                          items: {
                            anyOf: [
                              { type: "string" },
                              { const: "another-value" }, // This caused the error
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = sanitizeVertexAISchema(schema);
      const prop1 = (result as any).properties["1"].value;
      expect(prop1.anyOf[1]).not.toHaveProperty("const");
      const prop8 = (result as any).properties["8"].value.items.properties["7"].value;
      const allOf = prop8.allOf[1].items.anyOf;
      expect(allOf[1]).not.toHaveProperty("const");
    });
  });

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      const schema = {};
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({});
    });

    it("should handle empty arrays", () => {
      const schema: unknown[] = [];
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual([]);
    });

    it("should handle arrays with empty objects", () => {
      const schema = [{}, { type: "string", const: "test" }];
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual([{}, { type: "string" }]);
    });

    it("should handle primitive values (strings, numbers)", () => {
      expect(sanitizeVertexAISchema("string")).toBe("string");
      expect(sanitizeVertexAISchema(42)).toBe(42);
      expect(sanitizeVertexAISchema(true)).toBe(true);
      expect(sanitizeVertexAISchema(null)).toBe(null);
    });

    it("should not mutate the original schema object", () => {
      const schema = {
        type: "string",
        const: "value",
        nested: {
          type: "object",
          const: "nested-value",
        },
      };
      const original = JSON.parse(JSON.stringify(schema)); // Deep clone
      sanitizeVertexAISchema(schema);
      expect(schema).toEqual(original);
    });

    it("should handle schema with only const field", () => {
      const schema = {
        const: "only-const",
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({});
    });
  });

  describe("real-world JSON schema patterns", () => {
    it("should handle enum alongside const (const should be removed)", () => {
      const schema = {
        type: "string",
        enum: ["option1", "option2"],
        const: "option1", // This shouldn't conflict with enum
      };
      const result = sanitizeVertexAISchema(schema);
      expect(result).toEqual({
        type: "string",
        enum: ["option1", "option2"],
      });
    });

    it("should handle oneOf with const", () => {
      const schema = {
        oneOf: [
          { type: "string", const: "text" },
          { type: "number", const: 0 },
        ],
      };
      const result = sanitizeVertexAISchema(schema);
      expect((result as any).oneOf[0]).toEqual({ type: "string" });
      expect((result as any).oneOf[1]).toEqual({ type: "number" });
    });

    it("should handle not with const", () => {
      const schema = {
        not: {
          type: "string",
          const: "forbidden",
        },
      };
      const result = sanitizeVertexAISchema(schema);
      expect((result as any).not).toEqual({ type: "string" });
      expect((result as any).not).not.toHaveProperty("const");
    });
  });
});
