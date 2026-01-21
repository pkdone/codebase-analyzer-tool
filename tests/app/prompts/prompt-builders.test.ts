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
    const result = buildInsightPrompt("technologies", content);

    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("schema");
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

    expect(result.prompt).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include APP_SUMMARY_CONTENT_DESC in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

    expect(result.prompt).toContain(APP_SUMMARY_CONTENT_DESC);
  });

  test("should include FILE_SUMMARIES_DATA_BLOCK_HEADER in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

    expect(result.prompt).toContain(`${FILE_SUMMARIES_DATA_BLOCK_HEADER}:`);
  });

  test("should include the content in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

    expect(result.prompt).toContain(content);
  });

  test("should NOT wrap content in code blocks", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

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
      const result = buildInsightPrompt(category, "test content");
      expect(result.schema).toBe(appSummaryConfigMap[category].responseSchema);
    }
  });

  test("should include category-specific instructions in the prompt", () => {
    const content = "* TestClass.java: A test class";
    const result = buildInsightPrompt("technologies", content);

    // Check that at least one instruction from the technologies config is present
    expect(result.prompt).toContain("technologies");
  });

  describe("forPartialAnalysis option", () => {
    test("should NOT include partial analysis note by default", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt("technologies", content);

      expect(result.prompt).not.toContain("partial analysis");
    });

    test("should NOT include partial analysis note when forPartialAnalysis is false", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt("technologies", content, { forPartialAnalysis: false });

      expect(result.prompt).not.toContain("partial analysis");
    });

    test("should include partial analysis note when forPartialAnalysis is true", () => {
      const content = "* TestClass.java: A test class";
      const result = buildInsightPrompt("technologies", content, { forPartialAnalysis: true });

      expect(result.prompt).toContain("partial analysis");
    });
  });

  describe("type safety", () => {
    test("should preserve schema type for each category", () => {
      // This test verifies compile-time type safety
      const technologiesResult = buildInsightPrompt("technologies", "content");
      const appDescriptionResult = buildInsightPrompt("appDescription", "content");
      const boundedContextsResult = buildInsightPrompt("boundedContexts", "content");

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
    const result = buildInsightPrompt("technologies", content);

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
  test("should return a non-empty string", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include the question", () => {
    const question = "How does authentication work?";
    const result = buildQueryPrompt(question, "const auth = {};");

    expect(result).toContain(question);
  });

  test("should include the code content", () => {
    const codeContent = "export function authenticate() { return true; }";
    const result = buildQueryPrompt("How does auth work?", codeContent);

    expect(result).toContain(codeContent);
  });

  test("should include QUESTION section marker", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result).toContain("QUESTION:");
  });

  test("should include CODE section marker", () => {
    const result = buildQueryPrompt("How does auth work?", "const auth = {};");

    expect(result).toContain("CODE:");
  });

  test("should format prompt in expected order", () => {
    const result = buildQueryPrompt("Test question?", "test content");

    const personaIndex = result.indexOf(DEFAULT_PERSONA_INTRODUCTION);
    const questionIndex = result.indexOf("QUESTION:");
    const codeIndex = result.indexOf("CODE:");

    expect(personaIndex).toBeLessThan(questionIndex);
    expect(questionIndex).toBeLessThan(codeIndex);
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
    const result = buildInsightPrompt("technologies", "content");

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
