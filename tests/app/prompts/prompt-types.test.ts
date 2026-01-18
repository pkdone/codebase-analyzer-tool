import { z } from "zod";
import { JSONSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";

describe("JSONSchemaPrompt Generic Type", () => {
  it("should allow JSONSchemaPrompt with specific schema types", () => {
    const stringSchema = z.string();
    const numberSchema = z.number();
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    // Type-level test: These should compile without errors
    const stringPrompt = new JSONSchemaPrompt<typeof stringSchema>({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: stringSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    });

    const numberPrompt = new JSONSchemaPrompt<typeof numberSchema>({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: numberSchema,
      dataBlockHeader: "FILE_SUMMARIES",
      wrapInCodeBlock: false,
    });

    const objectPrompt = new JSONSchemaPrompt<typeof objectSchema>({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: objectSchema,
      dataBlockHeader: "FRAGMENTED_DATA",
      wrapInCodeBlock: false,
    });

    // Runtime assertions
    expect(stringPrompt.responseSchema).toBe(stringSchema);
    expect(numberPrompt.responseSchema).toBe(numberSchema);
    expect(objectPrompt.responseSchema).toBe(objectSchema);
  });

  it("should work with default generic parameter (backward compatibility)", () => {
    const genericSchema = z.unknown();

    // Type-level test: Should compile without explicit generic parameter
    const genericPrompt = new JSONSchemaPrompt({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: genericSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    });

    expect(genericPrompt.responseSchema).toBe(genericSchema);
  });

  it("should preserve schema type through generic parameter", () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      age: z.number().min(0),
    });

    const userPrompt = new JSONSchemaPrompt<typeof userSchema>({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "User data analysis",
      instructions: ["Extract user information"],
      responseSchema: userSchema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    });

    // Verify the schema is preserved at runtime
    expect(userPrompt.responseSchema).toBe(userSchema);

    // Type-level test: responseSchema should be typed as the specific user schema
    const parsed = userPrompt.responseSchema.parse({
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

    const prompt = new JSONSchemaPrompt<typeof schema>({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test",
      instructions: [],
      responseSchema: schema,
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    });

    expect(prompt.wrapInCodeBlock).toBe(true);
  });
});
