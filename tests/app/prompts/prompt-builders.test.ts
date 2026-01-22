/**
 * Tests for prompt builder functions.
 */

import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import {
  buildSourcePrompt,
  buildInsightPrompt,
  buildReducePrompt,
  buildQueryPrompt,
} from "../../../src/app/prompts/prompt-builders";
import type { FileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";
import {
  DEFAULT_PERSONA_INTRODUCTION,
  FRAGMENTED_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import type { AppSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";

describe("buildSourcePrompt", () => {
  const mockSchema = z.object({
    purpose: z.string(),
    implementation: z.string(),
  });

  const mockFileTypePromptRegistry = {
    java: {
      contentDesc: "the JVM code",
      responseSchema: mockSchema,
      instructions: ["Extract the purpose", "Extract the implementation"],
      hasComplexSchema: false,
    },
    javascript: {
      contentDesc: "the JavaScript/TypeScript code",
      responseSchema: mockSchema,
      instructions: ["Extract the purpose", "Extract the implementation"],
      hasComplexSchema: true,
    },
  } as unknown as FileTypePromptRegistry;

  test("should return a GeneratedPrompt with all required fields", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("schema");
    expect(result).toHaveProperty("metadata");
    expect(result.metadata).toHaveProperty("hasComplexSchema");
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION in the prompt", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.prompt).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include contentDesc from config in the prompt", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.prompt).toContain("the JVM code");
  });

  test("should include CODE data block header in the prompt", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.prompt).toContain("CODE:");
  });

  test("should include the content wrapped in code blocks", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.prompt).toContain("```");
    expect(result.prompt).toContain(content);
  });

  test("should return the correct schema from config", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.schema).toBe(mockSchema);
  });

  test("should return metadata.hasComplexSchema as false when not set in config", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.metadata.hasComplexSchema).toBe(false);
  });

  test("should return metadata.hasComplexSchema as true when set in config", () => {
    const content = "const x = 1;";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "javascript", content);

    expect(result.metadata.hasComplexSchema).toBe(true);
  });

  test("should include instructions in the prompt", () => {
    const content = "public class Test {}";
    const result = buildSourcePrompt(mockFileTypePromptRegistry, "java", content);

    expect(result.prompt).toContain("Extract the purpose");
    expect(result.prompt).toContain("Extract the implementation");
  });
});

describe("buildInsightPrompt", () => {
  test("should return a GeneratedPrompt with all required fields", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("schema");
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    expect(result.prompt).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include APP_SUMMARY_CONTENT_DESC in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    expect(result.prompt).toContain(APP_SUMMARY_CONTENT_DESC);
  });

  test("should include FILE_SUMMARIES_DATA_BLOCK_HEADER in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    expect(result.prompt).toContain(`${FILE_SUMMARIES_DATA_BLOCK_HEADER}:`);
  });

  test("should include the content in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    expect(result.prompt).toContain(content);
  });

  test("should NOT wrap content in code blocks", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    // Count occurrences of triple backticks - should only be for JSON schema
    const codeBlockCount = (result.prompt.match(/```/g) ?? []).length;
    // Schema section has opening and closing backticks (2 occurrences)
    expect(codeBlockCount).toBe(2);
  });

  test("should return the correct schema for each category", () => {
    const categories: (keyof AppSummaryConfigMap)[] = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "potentialMicroservices",
      "inferredArchitecture",
    ];

    for (const category of categories) {
      const result = buildInsightPrompt(appSummaryConfigMap, category, "test content");
      expect(result.schema).toBe(appSummaryConfigMap[category].responseSchema);
    }
  });

  test("should include category-specific instructions in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    // Check that at least one instruction from the technologies config is present
    expect(result.prompt).toContain("technologies");
  });

  describe("forPartialAnalysis option", () => {
    test("should NOT include partial analysis note by default", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

      expect(result.prompt).not.toContain("partial analysis");
    });

    test("should NOT include partial analysis note when forPartialAnalysis is false", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content, {
        forPartialAnalysis: false,
      });

      expect(result.prompt).not.toContain("partial analysis");
    });

    test("should include partial analysis note when forPartialAnalysis is true", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content, {
        forPartialAnalysis: true,
      });

      expect(result.prompt).toContain("partial analysis");
    });
  });

  describe("type safety", () => {
    test("should preserve schema type for each category", () => {
      // This test verifies compile-time type safety
      const technologiesResult = buildInsightPrompt(appSummaryConfigMap, "technologies", "content");
      const appDescriptionResult = buildInsightPrompt(
        appSummaryConfigMap,
        "appDescription",
        "content",
      );
      const boundedContextsResult = buildInsightPrompt(
        appSummaryConfigMap,
        "boundedContexts",
        "content",
      );

      // Each result's schema property should match the category's schema
      expect(technologiesResult.schema).toBe(appSummaryConfigMap.technologies.responseSchema);
      expect(appDescriptionResult.schema).toBe(appSummaryConfigMap.appDescription.responseSchema);
      expect(boundedContextsResult.schema).toBe(appSummaryConfigMap.boundedContexts.responseSchema);
    });
  });
});

describe("Prompt output consistency", () => {
  /**
   * These tests verify that the builder functions produce the same output
   * as the previous manual prompt construction logic.
   */

  test("buildSourcePrompt should produce consistent prompt structure", () => {
    const mockSchema = z.object({ purpose: z.string() });
    const mockRegistry = {
      java: {
        contentDesc: "the JVM code",
        responseSchema: mockSchema,
        instructions: ["Extract purpose"],
      },
    } as unknown as FileTypePromptRegistry;

    const content = "public class Test {}";
    const result = buildSourcePrompt(mockRegistry, "java", content);

    // Verify the prompt has the expected structure
    expect(result.prompt).toMatch(/^Act as a senior developer/);
    expect(result.prompt).toContain("the JVM code");
    expect(result.prompt).toContain("CODE:");
    expect(result.prompt).toContain("```");
    expect(result.prompt).toContain(content);
  });

  test("buildInsightPrompt should produce consistent prompt structure", () => {
    const content = "* File summaries here";
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    // Verify the prompt has the expected structure
    expect(result.prompt).toMatch(/^Act as a senior developer/);
    expect(result.prompt).toContain(APP_SUMMARY_CONTENT_DESC);
    expect(result.prompt).toContain(`${FILE_SUMMARIES_DATA_BLOCK_HEADER}:`);
    expect(result.prompt).toContain(content);
  });
});

describe("buildReducePrompt", () => {
  const mockSchema = z.object({
    technologies: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    ),
  });

  test("should return a GeneratedPrompt with all required fields", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("schema");
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION in the prompt", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include FRAGMENTED_DATA data block header in the prompt", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain(`${FRAGMENTED_DATA_BLOCK_HEADER}:`);
  });

  test("should include categoryKey in the instructions", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain("technologies");
  });

  test("should include the content in the prompt", () => {
    const content = JSON.stringify({
      technologies: [{ name: "TypeScript", description: "Language" }],
    });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain("TypeScript");
  });

  test("should return the provided schema", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.schema).toBe(mockSchema);
  });

  test("should include consolidation instructions", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain("consolidated");
  });

  test("should include de-duplication context", () => {
    const content = JSON.stringify({ technologies: [] });
    const result = buildReducePrompt("technologies", content, mockSchema);

    expect(result.prompt).toContain("de-duplicated");
  });
});

describe("buildQueryPrompt", () => {
  test("should return a TextGeneratedPrompt object", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result).toHaveProperty("prompt");
    expect(typeof result.prompt).toBe("string");
  });

  test("should return a non-empty prompt string", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result.prompt.length).toBeGreaterThan(0);
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result.prompt).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include the question", () => {
    const question = "How does authentication work?";
    const result = buildQueryPrompt(question, "const auth = {};");

    expect(result.prompt).toContain(question);
  });

  test("should include the code content", () => {
    const codeContent = "export function authenticate() { return true; }";
    const result = buildQueryPrompt("How does auth work?", codeContent);

    expect(result.prompt).toContain(codeContent);
  });

  test("should include QUESTION section marker", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result.prompt).toContain("QUESTION:");
  });

  test("should include CODE section marker", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result.prompt).toContain("CODE:");
  });

  test("should format prompt in expected order", () => {
    const result = buildQueryPrompt("Test question?", "test content");

    const personaIndex = result.prompt.indexOf(DEFAULT_PERSONA_INTRODUCTION);
    const questionIndex = result.prompt.indexOf("QUESTION:");
    const codeIndex = result.prompt.indexOf("CODE:");

    expect(personaIndex).toBeLessThan(questionIndex);
    expect(questionIndex).toBeLessThan(codeIndex);
  });

  test("should not include metadata by default", () => {
    const result = buildQueryPrompt("Test question?", "test content");

    expect(result.metadata).toBeUndefined();
  });
});

describe("GeneratedPrompt type consistency", () => {
  /**
   * These tests verify that all prompt builders return results that conform
   * to the GeneratedPrompt interface structure.
   */

  test("buildSourcePrompt should return consistent GeneratedPrompt structure", () => {
    const mockSchema = z.object({ purpose: z.string() });
    const mockRegistry = {
      java: {
        contentDesc: "JVM code",
        responseSchema: mockSchema,
        instructions: ["Extract purpose"],
        hasComplexSchema: true,
      },
    } as unknown as FileTypePromptRegistry;

    const result = buildSourcePrompt(mockRegistry, "java", "code");

    // Verify GeneratedPrompt structure
    expect(typeof result.prompt).toBe("string");
    expect(result.schema).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.hasComplexSchema).toBe("boolean");
  });

  test("buildInsightPrompt should return consistent GeneratedPrompt structure", () => {
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", "content");

    // Verify GeneratedPrompt structure
    expect(typeof result.prompt).toBe("string");
    expect(result.schema).toBeDefined();
    // InsightPromptResult has optional metadata
    expect(result.metadata).toBeUndefined();
  });

  test("buildReducePrompt should return consistent GeneratedPrompt structure", () => {
    const mockSchema = z.object({ data: z.array(z.string()) });
    const result = buildReducePrompt("data", "content", mockSchema);

    // Verify GeneratedPrompt structure
    expect(typeof result.prompt).toBe("string");
    expect(result.schema).toBe(mockSchema);
    // ReducePromptResult has optional metadata
    expect(result.metadata).toBeUndefined();
  });
});

describe("buildInsightPrompt with custom config", () => {
  /**
   * Tests that verify the dependency injection benefit of passing configMap as a parameter.
   * This enables better testability and allows consumers to use custom configurations.
   */

  test("should use the provided config map instead of global state", () => {
    const customSchema = z.object({ customField: z.string() });
    const customConfigMap = {
      technologies: {
        contentDesc: "custom content description",
        dataBlockHeader: "CUSTOM_HEADER",
        responseSchema: customSchema,
        instructions: ["Custom instruction for testing"],
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(customConfigMap, "technologies", "test content");

    expect(result.prompt).toContain("custom content description");
    expect(result.prompt).toContain("CUSTOM_HEADER:");
    expect(result.prompt).toContain("Custom instruction for testing");
    expect(result.schema).toBe(customSchema);
  });

  test("should use custom dataBlockHeader in partial analysis note", () => {
    const customSchema = z.object({ items: z.array(z.string()) });
    const customConfigMap = {
      technologies: {
        contentDesc: "test description",
        dataBlockHeader: "MY_CUSTOM_BLOCK",
        responseSchema: customSchema,
        instructions: ["Test instruction"],
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(customConfigMap, "technologies", "content", {
      forPartialAnalysis: true,
    });

    // The partial analysis note should use the custom header (converted to lowercase with spaces)
    expect(result.prompt).toContain("my custom block");
    expect(result.prompt).toContain("partial analysis");
  });

  test("should allow different config maps for different test scenarios", () => {
    const schemaA = z.object({ fieldA: z.string() });
    const schemaB = z.object({ fieldB: z.number() });

    const configMapA = {
      technologies: {
        contentDesc: "description A",
        dataBlockHeader: "HEADER_A",
        responseSchema: schemaA,
        instructions: ["Instruction A"],
      },
    } as unknown as AppSummaryConfigMap;

    const configMapB = {
      technologies: {
        contentDesc: "description B",
        dataBlockHeader: "HEADER_B",
        responseSchema: schemaB,
        instructions: ["Instruction B"],
      },
    } as unknown as AppSummaryConfigMap;

    const resultA = buildInsightPrompt(configMapA, "technologies", "content");
    const resultB = buildInsightPrompt(configMapB, "technologies", "content");

    expect(resultA.prompt).toContain("description A");
    expect(resultA.prompt).toContain("HEADER_A:");
    expect(resultA.schema).toBe(schemaA);

    expect(resultB.prompt).toContain("description B");
    expect(resultB.prompt).toContain("HEADER_B:");
    expect(resultB.schema).toBe(schemaB);
  });
});
