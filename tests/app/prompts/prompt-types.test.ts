import { z } from "zod";
import type { PromptDefinition } from "../../../src/app/prompts/prompt.types";

describe("PromptDefinition Generic Type", () => {
  it("should allow PromptDefinition with specific schema types", () => {
    const stringSchema = z.string();
    const numberSchema = z.number();
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    // Type-level test: These should compile without errors
    const stringPromptDef: PromptDefinition<typeof stringSchema> = {
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: stringSchema,
      template: "Test template",
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    const numberPromptDef: PromptDefinition<typeof numberSchema> = {
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: numberSchema,
      template: "Test template",
      dataBlockHeader: "FILE_SUMMARIES",
      wrapInCodeBlock: false,
    };

    const objectPromptDef: PromptDefinition<typeof objectSchema> = {
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: objectSchema,
      template: "Test template",
      dataBlockHeader: "FRAGMENTED_DATA",
      wrapInCodeBlock: false,
    };

    // Runtime assertions
    expect(stringPromptDef.responseSchema).toBe(stringSchema);
    expect(numberPromptDef.responseSchema).toBe(numberSchema);
    expect(objectPromptDef.responseSchema).toBe(objectSchema);
  });

  it("should work with default generic parameter (backward compatibility)", () => {
    const genericSchema = z.unknown();

    // Type-level test: Should compile without explicit generic parameter
    const genericPromptDef: PromptDefinition = {
      contentDesc: "Test intro",
      instructions: ["Instruction 1"],
      responseSchema: genericSchema,
      template: "Test template",
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
    };

    expect(genericPromptDef.responseSchema).toBe(genericSchema);
  });

  it("should preserve schema type through generic parameter", () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      age: z.number().min(0),
    });

    type UserPromptDef = PromptDefinition<typeof userSchema>;

    const userPromptDef: UserPromptDef = {
      contentDesc: "User data analysis",
      instructions: ["Extract user information"],
      responseSchema: userSchema,
      template: "User template",
      dataBlockHeader: "CODE",
      wrapInCodeBlock: true,
      label: "User Schema",
    };

    // Verify the schema is preserved at runtime
    expect(userPromptDef.responseSchema).toBe(userSchema);
    expect(userPromptDef.label).toBe("User Schema");

    // Type-level test: responseSchema should be typed as the specific user schema
    const parsed = userPromptDef.responseSchema.parse({
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

    const promptDef: PromptDefinition<typeof schema> = {
      contentDesc: "Test",
      instructions: [],
      responseSchema: schema,
      template: "Template",
      dataBlockHeader: "CODE",
      // Optional fields
      label: "Test Label",
      wrapInCodeBlock: true,
    };

    expect(promptDef.label).toBe("Test Label");
    expect(promptDef.wrapInCodeBlock).toBe(true);
  });
});
