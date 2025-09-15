import { getNestedValue, getNestedValueWithFallbacks } from "../../../src/common/utils/object-utils";

describe("Object Utils", () => {
  describe("getNestedValue", () => {
    describe("simple property access", () => {
      it("should get top-level property", () => {
        const obj = { name: "John", age: 30 };
        
        expect(getNestedValue(obj, "name")).toBe("John");
        expect(getNestedValue(obj, "age")).toBe(30);
      });

      it("should get nested property", () => {
        const obj = {
          user: {
            profile: {
              name: "John",
              email: "john@example.com"
            }
          }
        };
        
        expect(getNestedValue(obj, "user.profile.name")).toBe("John");
        expect(getNestedValue(obj, "user.profile.email")).toBe("john@example.com");
      });

      it("should return undefined for non-existent property", () => {
        const obj = { name: "John" };
        
        expect(getNestedValue(obj, "nonexistent")).toBeUndefined();
        expect(getNestedValue(obj, "user.profile.name")).toBeUndefined();
      });

      it("should handle empty string path", () => {
        const obj = { name: "John" };
        
        expect(getNestedValue(obj, "")).toBeUndefined();
      });
    });

    describe("array access", () => {
      it("should access array elements using bracket notation", () => {
        const obj = {
          users: ["Alice", "Bob", "Charlie"],
          data: {
            items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }]
          }
        };
        
        expect(getNestedValue(obj, "users[0]")).toBe("Alice");
        expect(getNestedValue(obj, "users[2]")).toBe("Charlie");
        expect(getNestedValue(obj, "data.items[1].name")).toBe("Item 2");
      });

      it("should handle out-of-bounds array access", () => {
        const obj = { numbers: [1, 2, 3] };
        
        expect(getNestedValue(obj, "numbers[5]")).toBeUndefined();
        expect(getNestedValue(obj, "numbers[-1]")).toBeUndefined();
      });

      it("should handle non-array properties with bracket notation", () => {
        const obj = { notArray: "string" };
        
        expect(getNestedValue(obj, "notArray[0]")).toBeUndefined();
      });

      it("should handle complex array access patterns", () => {
        const obj = {
          response: {
            choices: [
              { message: { content: "Hello" } },
              { message: { content: "World" } }
            ]
          }
        };
        
        expect(getNestedValue(obj, "response.choices[0].message.content")).toBe("Hello");
        expect(getNestedValue(obj, "response.choices[1].message.content")).toBe("World");
      });

      it("should handle nested arrays", () => {
        const obj = {
          matrix: [
            [1, 2, 3],
            [4, 5, 6]
          ]
        };
        
        expect(getNestedValue(obj, "matrix[0][1]")).toBeUndefined(); // Double bracket not supported
        expect(getNestedValue(obj, "matrix[1]")).toEqual([4, 5, 6]);
      });
    });

    describe("edge cases and null safety", () => {
      it("should handle null and undefined values in the path", () => {
        const obj = {
          user: null,
          data: {
            info: undefined,
            nested: {
              value: "test"
            }
          }
        };
        
        expect(getNestedValue(obj, "user.name")).toBeUndefined();
        expect(getNestedValue(obj, "data.info.value")).toBeUndefined();
        expect(getNestedValue(obj, "data.nested.value")).toBe("test");
      });

      it("should handle null/undefined root object", () => {
        expect(getNestedValue(null as any, "any.path")).toBeUndefined();
        expect(getNestedValue(undefined as any, "any.path")).toBeUndefined();
      });

      it("should handle empty object", () => {
        const obj = {};
        
        expect(getNestedValue(obj, "any.path")).toBeUndefined();
      });

      it("should handle falsy values properly", () => {
        const obj = {
          zero: 0,
          emptyString: "",
          false: false,
          nested: {
            zero: 0,
            emptyArray: []
          }
        };
        
        expect(getNestedValue(obj, "zero")).toBe(0);
        expect(getNestedValue(obj, "emptyString")).toBe("");
        expect(getNestedValue(obj, "false")).toBe(false);
        expect(getNestedValue(obj, "nested.zero")).toBe(0);
        expect(getNestedValue(obj, "nested.emptyArray")).toEqual([]);
      });

      it("should handle special characters in property names", () => {
        const obj = {
          "special-key": "value1",
          "key with spaces": "value2",
          "123numeric": "value3"
        };
        
        expect(getNestedValue(obj, "special-key")).toBe("value1");
        expect(getNestedValue(obj, "key with spaces")).toBe("value2");
        expect(getNestedValue(obj, "123numeric")).toBe("value3");
      });
    });

    describe("real-world LLM response patterns", () => {
      it("should handle OpenAI-style response structure", () => {
        const openaiResponse = {
          choices: [
            {
              message: {
                content: "Hello, how can I help you?",
                role: "assistant"
              },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        };
        
        expect(getNestedValue(openaiResponse, "choices[0].message.content"))
          .toBe("Hello, how can I help you?");
        expect(getNestedValue(openaiResponse, "choices[0].finish_reason")).toBe("stop");
        expect(getNestedValue(openaiResponse, "usage.prompt_tokens")).toBe(10);
      });

      it("should handle Bedrock-style response structure", () => {
        const bedrockResponse = {
          content: [
            {
              text: "This is the response text"
            }
          ],
          stop_reason: "end_turn",
          usage: {
            input_tokens: 15,
            output_tokens: 12
          }
        };
        
        expect(getNestedValue(bedrockResponse, "content[0].text"))
          .toBe("This is the response text");
        expect(getNestedValue(bedrockResponse, "stop_reason")).toBe("end_turn");
        expect(getNestedValue(bedrockResponse, "usage.input_tokens")).toBe(15);
      });

      it("should handle complex nested API responses", () => {
        const complexResponse = {
          data: {
            results: [
              {
                items: [
                  { type: "text", value: "First item" },
                  { type: "code", value: "console.log('test');" }
                ],
                metadata: {
                  timestamp: "2023-01-01",
                  source: "llm"
                }
              }
            ]
          }
        };
        
        expect(getNestedValue(complexResponse, "data.results[0].items[1].value"))
          .toBe("console.log('test');");
        expect(getNestedValue(complexResponse, "data.results[0].metadata.source"))
          .toBe("llm");
      });
    });
  });

  describe("getNestedValueWithFallbacks", () => {
    describe("basic fallback functionality", () => {
      it("should return first available value", () => {
        const obj = {
          primary: "primary value",
          secondary: "secondary value",
          tertiary: "tertiary value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary", "tertiary"]);
        expect(result).toBe("primary value");
      });

      it("should fallback to second path when first is undefined", () => {
        const obj = {
          secondary: "secondary value",
          tertiary: "tertiary value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary", "tertiary"]);
        expect(result).toBe("secondary value");
      });

      it("should fallback to last path when others are undefined", () => {
        const obj = {
          tertiary: "tertiary value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary", "tertiary"]);
        expect(result).toBe("tertiary value");
      });

      it("should return undefined when all paths are undefined", () => {
        const obj = {
          other: "other value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary", "tertiary"]);
        expect(result).toBeUndefined();
      });
    });

    describe("null/undefined handling", () => {
      it("should skip null values and continue to fallbacks", () => {
        const obj = {
          primary: null,
          secondary: "secondary value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary"]);
        expect(result).toBe("secondary value");
      });

      it("should skip undefined values and continue to fallbacks", () => {
        const obj = {
          primary: undefined,
          secondary: "secondary value"
        };
        
        const result = getNestedValueWithFallbacks(obj, ["primary", "secondary"]);
        expect(result).toBe("secondary value");
      });

      it("should return falsy values that are not null/undefined", () => {
        const obj = {
          zero: 0,
          emptyString: "",
          false: false
        };
        
        expect(getNestedValueWithFallbacks(obj, ["zero", "fallback"])).toBe(0);
        expect(getNestedValueWithFallbacks(obj, ["emptyString", "fallback"])).toBe("");
        expect(getNestedValueWithFallbacks(obj, ["false", "fallback"])).toBe(false);
      });
    });

    describe("complex path fallbacks", () => {
      it("should handle nested paths in fallbacks", () => {
        const obj = {
          user: {
            name: "John"
          },
          profile: {
            displayName: "John Doe"
          }
        };
        
        const result = getNestedValueWithFallbacks(obj, [
          "user.firstName",
          "user.name",
          "profile.displayName"
        ]);
        expect(result).toBe("John");
      });

      it("should handle array access in fallbacks", () => {
        const obj = {
          choices: [
            { message: { content: "Hello" } }
          ],
          alternatives: [
            { text: "Alternative response" }
          ]
        };
        
        const result = getNestedValueWithFallbacks(obj, [
          "response[0].text",
          "choices[0].message.content",
          "alternatives[0].text"
        ]);
        expect(result).toBe("Hello");
      });

      it("should handle mixed simple and complex paths", () => {
        const obj = {
          data: {
            response: {
              content: "Nested content"
            }
          },
          simpleContent: "Simple content"
        };
        
        const result = getNestedValueWithFallbacks(obj, [
          "content",
          "data.response.content",
          "simpleContent"
        ]);
        expect(result).toBe("Nested content");
      });
    });

    describe("real-world LLM provider fallback scenarios", () => {
      it("should handle different LLM response formats", () => {
        const response = {
          // Some providers use 'content', others use 'text'
          choices: [
            {
              message: {
                content: "Response content"
              }
            }
          ]
        };
        
        const result = getNestedValueWithFallbacks(response, [
          "text",                           // Direct text field (some providers)
          "response.text",                  // Nested text field
          "choices[0].text",               // OpenAI-style text field
          "choices[0].message.content",    // OpenAI-style message content
          "content[0].text"                // Anthropic/Bedrock style
        ]);
        
        expect(result).toBe("Response content");
      });

      it("should handle token usage fallback patterns", () => {
        const response = {
          usage: {
            input_tokens: 10,
            output_tokens: 15
          }
        };
        
        const promptTokens = getNestedValueWithFallbacks(response, [
          "usage.prompt_tokens",    // OpenAI style
          "usage.input_tokens",     // Bedrock style
          "token_usage.prompt",     // Alternative style
          "tokens.input"            // Another alternative
        ]);
        
        expect(promptTokens).toBe(10);
      });

      it("should handle stop reason fallback patterns", () => {
        const response = {
          stop_reason: "end_turn"
        };
        
        const stopReason = getNestedValueWithFallbacks(response, [
          "choices[0].finish_reason",  // OpenAI style
          "stop_reason",               // Bedrock/Anthropic style
          "finish_reason",             // Alternative
          "completion.stop_reason"     // Nested alternative
        ]);
        
        expect(stopReason).toBe("end_turn");
      });

      it("should handle provider-specific content extraction", () => {
        // Simulate a response that could be from different providers
        const response = {
          content: [
            {
              text: "Bedrock/Anthropic style response"
            }
          ]
        };
        
        const content = getNestedValueWithFallbacks(response, [
          "choices[0].message.content",    // OpenAI
          "content[0].text",               // Bedrock/Anthropic  
          "response.text",                 // Alternative
          "text",                          // Direct text
          "message.content"                // Another alternative
        ]);
        
        expect(content).toBe("Bedrock/Anthropic style response");
      });
    });

    describe("empty paths array", () => {
      it("should return undefined for empty paths array", () => {
        const obj = { value: "test" };
        
        const result = getNestedValueWithFallbacks(obj, []);
        expect(result).toBeUndefined();
      });
    });

    describe("path validation", () => {
      it("should handle invalid path formats gracefully", () => {
        const obj = { value: "test" };
        
        const result = getNestedValueWithFallbacks(obj, [
          "",                    // Empty string path
          "valid.path",         // Valid path that doesn't exist
          "value"               // Valid path that exists
        ]);
        
        expect(result).toBe("test");
      });
    });
  });
});
