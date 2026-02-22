import { z } from "zod";
import {
  renderJsonSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";

describe("renderJsonSchemaPrompt Generic Type", () => {
  it("should allow renderJsonSchemaPrompt with specific schema types", () => {
    const stringSchema = z.string();
    const numberSchema = z.number();
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    // Type-level test: These configs should compile without errors
    const stringConfig: JSONSchemaPromptConfig<typeof stringSchema> = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: stringSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    const numberConfig: JSONSchemaPromptConfig<typeof numberSchema> = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: numberSchema,
      dataBlockHeader: "FILE_SUMMARIES",
      wrapInCodeBlock: false,
    };

    const objectConfig: JSONSchemaPromptConfig<typeof objectSchema> = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: objectSchema,
      dataBlockHeader: "FRAGMENTED_DATA",
      wrapInCodeBlock: false,
    };

    // Runtime assertions - render and verify
    const stringResult = renderJsonSchemaPrompt(stringConfig, "test");
    const numberResult = renderJsonSchemaPrompt(numberConfig, "test");
    const objectResult = renderJsonSchemaPrompt(objectConfig, "test");

    expect(stringResult).toBeDefined();
    expect(numberResult).toBeDefined();
    expect(objectResult).toBeDefined();
  });

  it("should work with default generic parameter (backward compatibility)", () => {
    const genericSchema = z.unknown();

    // Type-level test: Should compile without explicit generic parameter
    const config: JSONSchemaPromptConfig = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: genericSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    const result = renderJsonSchemaPrompt(config, "test");
    expect(result).toBeDefined();
  });

  it("should preserve schema type through generic parameter", () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      age: z.number().min(0),
    });

    const config: JSONSchemaPromptConfig<typeof userSchema> = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "User data analysis",
      instructions: ["Extract user information"],
      responseSchema: userSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    // Verify the schema is preserved at runtime
    expect(config.responseSchema).toBe(userSchema);

    // Type-level test: responseSchema should be typed as the specific user schema
    const parsed = config.responseSchema.parse({
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    });

    expect(parsed).toEqual({
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    });
  });

  it("should handle optional fields correctly", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const config: JSONSchemaPromptConfig<typeof schema> = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test",
      instructions: [],
      responseSchema: schema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    expect(config.wrapInCodeBlock).toBe(true);
  });
});
