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
  createPromptGenerator,
} from "../../../src/app/prompts/prompt-builders";
import {
  fileTypePromptRegistry,
  type FileTypePromptRegistry,
} from "../../../src/app/prompts/sources/sources.definitions";
import type { CanonicalFileType } from "../../../src/app/schemas/canonical-file-types";
import {
  DEFAULT_PERSONA_INTRODUCTION,
  FRAGMENTED_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  CODE_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import type { AppSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import type { BasePromptConfigEntry } from "../../../src/app/prompts/prompts.types";

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
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
    },
    javascript: {
      contentDesc: "the JavaScript/TypeScript code",
      responseSchema: mockSchema,
      instructions: ["Extract the purpose", "Extract the implementation"],
      hasComplexSchema: true,
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
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

  describe("type safety", () => {
    /**
     * Tests that verify compile-time type safety through the generic K parameter.
     * When called with literal file types, the return type should be narrowed
     * to the specific schema for that file type.
     */

    test("should preserve schema type for specific file type literals", () => {
      // This test verifies that calling with literal string types produces
      // results with the specific schema for each file type
      const javaResult = buildSourcePrompt(fileTypePromptRegistry, "java", "code");
      const pythonResult = buildSourcePrompt(fileTypePromptRegistry, "python", "code");
      const javascriptResult = buildSourcePrompt(fileTypePromptRegistry, "javascript", "code");

      // Each result's schema property should match the file type's schema
      expect(javaResult.schema).toBe(fileTypePromptRegistry.java.responseSchema);
      expect(pythonResult.schema).toBe(fileTypePromptRegistry.python.responseSchema);
      expect(javascriptResult.schema).toBe(fileTypePromptRegistry.javascript.responseSchema);
    });

    test("should work with CanonicalFileType union parameter", () => {
      // This verifies backward compatibility when called with a union type variable
      const fileType: CanonicalFileType = "java";
      const result = buildSourcePrompt(fileTypePromptRegistry, fileType, "code");

      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("metadata");
      expect(result.schema).toBe(fileTypePromptRegistry.java.responseSchema);
    });

    test("should preserve schema type for dependency file types", () => {
      // Test dependency file types which use a different schema
      const mavenResult = buildSourcePrompt(fileTypePromptRegistry, "maven", "pom content");
      const npmResult = buildSourcePrompt(fileTypePromptRegistry, "npm", "package.json content");

      expect(mavenResult.schema).toBe(fileTypePromptRegistry.maven.responseSchema);
      expect(npmResult.schema).toBe(fileTypePromptRegistry.npm.responseSchema);
    });

    test("should preserve schema type for special file types", () => {
      // Test special file types like SQL, Markdown, etc.
      const sqlResult = buildSourcePrompt(fileTypePromptRegistry, "sql", "SELECT * FROM users");
      const markdownResult = buildSourcePrompt(fileTypePromptRegistry, "markdown", "# Heading");

      expect(sqlResult.schema).toBe(fileTypePromptRegistry.sql.responseSchema);
      expect(markdownResult.schema).toBe(fileTypePromptRegistry.markdown.responseSchema);
    });
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
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
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
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
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
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.hasComplexSchema).toBe("boolean");
  });

  test("buildReducePrompt should return consistent GeneratedPrompt structure", () => {
    const mockSchema = z.object({ data: z.array(z.string()) });
    const result = buildReducePrompt("data", "content", mockSchema);

    // Verify GeneratedPrompt structure
    expect(typeof result.prompt).toBe("string");
    expect(result.schema).toBe(mockSchema);
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.hasComplexSchema).toBe("boolean");
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
        wrapInCodeBlock: false,
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
        wrapInCodeBlock: false,
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
        wrapInCodeBlock: false,
        responseSchema: schemaA,
        instructions: ["Instruction A"],
      },
    } as unknown as AppSummaryConfigMap;

    const configMapB = {
      technologies: {
        contentDesc: "description B",
        dataBlockHeader: "HEADER_B",
        wrapInCodeBlock: false,
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

describe("buildInsightPrompt metadata handling", () => {
  test("should return metadata with hasComplexSchema from appSummaryConfigMap", () => {
    const result = buildInsightPrompt(appSummaryConfigMap, "technologies", "test content");

    expect(result.metadata).toBeDefined();
    expect(result.metadata.hasComplexSchema).toBe(false);
  });

  test("should use hasComplexSchema from config when set to true", () => {
    const customSchema = z.object({ items: z.array(z.string()) });
    const configWithComplexSchema = {
      technologies: {
        contentDesc: "test",
        dataBlockHeader: "TEST",
        wrapInCodeBlock: false,
        responseSchema: customSchema,
        instructions: ["Test"],
        hasComplexSchema: true,
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(configWithComplexSchema, "technologies", "content");

    expect(result.metadata.hasComplexSchema).toBe(true);
  });

  test("should pass through hasComplexSchema value from config (undefined when not set)", () => {
    const customSchema = z.object({ items: z.array(z.string()) });
    const configWithoutFlag = {
      technologies: {
        contentDesc: "test",
        dataBlockHeader: "TEST",
        wrapInCodeBlock: false,
        responseSchema: customSchema,
        instructions: ["Test"],
        // no hasComplexSchema field - metadata will have undefined
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(configWithoutFlag, "technologies", "content");

    // When hasComplexSchema is not in config, metadata reflects undefined
    // Note: Real appSummaryConfigMap entries always have hasComplexSchema: false explicitly
    expect(result.metadata.hasComplexSchema).toBeUndefined();
  });

  test("should include metadata for all appSummaryConfigMap categories", () => {
    const categories: (keyof typeof appSummaryConfigMap)[] = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "potentialMicroservices",
      "inferredArchitecture",
    ];

    for (const category of categories) {
      const result = buildInsightPrompt(appSummaryConfigMap, category, "test content");
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata.hasComplexSchema).toBe("boolean");
    }
  });
});

describe("buildReducePrompt metadata handling", () => {
  const mockSchema = z.object({ items: z.array(z.string()) });

  test("should return metadata with hasComplexSchema defaulting to false", () => {
    const result = buildReducePrompt("items", "content", mockSchema);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.hasComplexSchema).toBe(false);
  });

  test("should use hasComplexSchema from options when set to true", () => {
    const result = buildReducePrompt("items", "content", mockSchema, { hasComplexSchema: true });

    expect(result.metadata.hasComplexSchema).toBe(true);
  });

  test("should use hasComplexSchema from options when set to false", () => {
    const result = buildReducePrompt("items", "content", mockSchema, { hasComplexSchema: false });

    expect(result.metadata.hasComplexSchema).toBe(false);
  });

  test("should default hasComplexSchema to false when options is undefined", () => {
    const result = buildReducePrompt("items", "content", mockSchema);

    expect(result.metadata.hasComplexSchema).toBe(false);
  });

  test("should default hasComplexSchema to false when options.hasComplexSchema is undefined", () => {
    const result = buildReducePrompt("items", "content", mockSchema, {});

    expect(result.metadata.hasComplexSchema).toBe(false);
  });
});

describe("createPromptGenerator", () => {
  /**
   * Tests for the createPromptGenerator helper function.
   * This function creates a type-safe JSONSchemaPrompt from a self-describing config entry.
   */

  const mockSchema = z.object({
    purpose: z.string(),
    implementation: z.string(),
  });

  const mockConfig: BasePromptConfigEntry<typeof mockSchema> = {
    contentDesc: "the test code",
    instructions: ["Extract the purpose", "Extract the implementation"],
    responseSchema: mockSchema,
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
  };

  test("should create a JSONSchemaPrompt that can render prompts", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
  });

  test("should include DEFAULT_PERSONA_INTRODUCTION in rendered prompts", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    expect(rendered).toContain(DEFAULT_PERSONA_INTRODUCTION);
  });

  test("should include contentDesc from config in rendered prompts", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    expect(rendered).toContain("the test code");
  });

  test("should include instructions from config in rendered prompts", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    expect(rendered).toContain("Extract the purpose");
    expect(rendered).toContain("Extract the implementation");
  });

  test("should include dataBlockHeader from config", () => {
    const customConfig: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      dataBlockHeader: "CUSTOM_HEADER",
    };
    const promptGenerator = createPromptGenerator(customConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    expect(rendered).toContain("CUSTOM_HEADER:");
  });

  test("should wrap content in code blocks when wrapInCodeBlock is true", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    // Should have code block markers around the content
    // Count occurrences - should be at least 4 (2 for JSON schema, 2 for content)
    const codeBlockCount = (rendered.match(/```/g) ?? []).length;
    expect(codeBlockCount).toBeGreaterThanOrEqual(4);
  });

  test("should NOT wrap content in code blocks when wrapInCodeBlock is false", () => {
    const noWrapConfig: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
    };
    const promptGenerator = createPromptGenerator(noWrapConfig);

    const rendered = promptGenerator.renderPrompt("* TestClass: A test class");

    // Should only have code block markers for JSON schema (2 occurrences)
    const codeBlockCount = (rendered.match(/```/g) ?? []).length;
    expect(codeBlockCount).toBe(2);
  });

  test("should include contextNote when provided as override", () => {
    const noWrapConfig: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
    };
    const promptGenerator = createPromptGenerator(
      noWrapConfig,
      "This is a partial analysis note.\n\n",
    );

    const rendered = promptGenerator.renderPrompt("* TestClass: A test class");

    expect(rendered).toContain("partial analysis note");
  });

  test("should include contextNote from config when no override", () => {
    const configWithNote: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
      contextNote: "Note from config.\n\n",
    };
    const promptGenerator = createPromptGenerator(configWithNote);

    const rendered = promptGenerator.renderPrompt("* TestClass: A test class");

    expect(rendered).toContain("Note from config");
  });

  test("should NOT include contextNote when not provided", () => {
    const noWrapConfig: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
    };
    const promptGenerator = createPromptGenerator(noWrapConfig);

    const rendered = promptGenerator.renderPrompt("* TestClass: A test class");

    expect(rendered).not.toContain("partial analysis note");
  });

  test("should include the content in rendered prompts", () => {
    const promptGenerator = createPromptGenerator(mockConfig);

    const content = "export function myFunction() { return 42; }";
    const rendered = promptGenerator.renderPrompt(content);

    expect(rendered).toContain(content);
  });

  test("should work with configs that have hasComplexSchema", () => {
    const configWithComplexSchema: BasePromptConfigEntry<typeof mockSchema> = {
      ...mockConfig,
      hasComplexSchema: true,
    };

    const promptGenerator = createPromptGenerator(configWithComplexSchema);

    const rendered = promptGenerator.renderPrompt("const x = 1;");

    // Should still render successfully
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
  });

  test("should work with different schema types", () => {
    const customSchema = z.object({
      items: z.array(z.string()),
      count: z.number(),
    });

    const customConfig: BasePromptConfigEntry<typeof customSchema> = {
      contentDesc: "the custom data",
      instructions: ["Extract items", "Count elements"],
      responseSchema: customSchema,
      dataBlockHeader: FRAGMENTED_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
    };

    const promptGenerator = createPromptGenerator(customConfig);

    const rendered = promptGenerator.renderPrompt("some data content");

    expect(rendered).toContain("the custom data");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain("Extract items");
    expect(rendered).toContain("Count elements");
  });
});

describe("createPromptGenerator integration with builders", () => {
  /**
   * Tests that verify createPromptGenerator produces the same output
   * as the refactored builder functions.
   */

  const mockSchema = z.object({
    purpose: z.string(),
  });

  test("should produce equivalent output to buildSourcePrompt", () => {
    const mockConfig: BasePromptConfigEntry<typeof mockSchema> = {
      contentDesc: "the JVM code",
      instructions: ["Extract purpose"],
      responseSchema: mockSchema,
      hasComplexSchema: false,
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
    };

    const mockRegistry = {
      java: mockConfig,
    } as unknown as FileTypePromptRegistry;

    const content = "public class Test {}";

    // Using buildSourcePrompt
    const builderResult = buildSourcePrompt(mockRegistry, "java", content);

    // Using createPromptGenerator directly
    const promptGenerator = createPromptGenerator(mockConfig);
    const directResult = promptGenerator.renderPrompt(content);

    // Both should produce the same prompt
    expect(builderResult.prompt).toBe(directResult);
  });

  test("should produce equivalent output to buildInsightPrompt", () => {
    const content = "* TestClass.java: A test class";

    // Using buildInsightPrompt
    const builderResult = buildInsightPrompt(appSummaryConfigMap, "technologies", content);

    // Using createPromptGenerator directly with the same config
    const config = appSummaryConfigMap.technologies;
    const promptGenerator = createPromptGenerator(config);
    const directResult = promptGenerator.renderPrompt(content);

    // Both should produce the same prompt
    expect(builderResult.prompt).toBe(directResult);
  });
});

describe("Self-describing config tests", () => {
  /**
   * Tests that verify configs are self-describing and builders read presentation
   * fields from config instead of hardcoding them.
   */

  const mockSchema = z.object({
    purpose: z.string(),
    implementation: z.string(),
  });

  test("buildSourcePrompt should use dataBlockHeader from config", () => {
    const customConfig = {
      java: {
        contentDesc: "test code",
        responseSchema: mockSchema,
        instructions: ["Test"],
        dataBlockHeader: "CUSTOM_SOURCE_HEADER",
        wrapInCodeBlock: true,
      },
    } as unknown as FileTypePromptRegistry;

    const result = buildSourcePrompt(customConfig, "java", "code");
    expect(result.prompt).toContain("CUSTOM_SOURCE_HEADER:");
  });

  test("buildSourcePrompt should use wrapInCodeBlock from config", () => {
    const noWrapConfig = {
      java: {
        contentDesc: "test code",
        responseSchema: mockSchema,
        instructions: ["Test"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      },
    } as unknown as FileTypePromptRegistry;

    const result = buildSourcePrompt(noWrapConfig, "java", "test content");
    // Should only have 2 code blocks (for JSON schema), not 4
    const codeBlockCount = (result.prompt.match(/```/g) ?? []).length;
    expect(codeBlockCount).toBe(2);
  });

  test("buildInsightPrompt should use wrapInCodeBlock from config", () => {
    const wrapConfig = {
      technologies: {
        contentDesc: "test summaries",
        responseSchema: mockSchema,
        instructions: ["Test"],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true, // Unusual but allowed by the self-describing config
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(wrapConfig, "technologies", "test content");
    // Should have 4 code blocks (2 for JSON schema, 2 for content)
    const codeBlockCount = (result.prompt.match(/```/g) ?? []).length;
    expect(codeBlockCount).toBeGreaterThanOrEqual(4);
  });

  test("buildInsightPrompt should respect wrapInCodeBlock: false from config", () => {
    const noWrapConfig = {
      technologies: {
        contentDesc: "test summaries",
        responseSchema: mockSchema,
        instructions: ["Test"],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      },
    } as unknown as AppSummaryConfigMap;

    const result = buildInsightPrompt(noWrapConfig, "technologies", "test content");
    // Should only have 2 code blocks (for JSON schema)
    const codeBlockCount = (result.prompt.match(/```/g) ?? []).length;
    expect(codeBlockCount).toBe(2);
  });

  test("real fileTypePromptRegistry entries should have presentation fields", () => {
    // Verify that the actual registry has the new required fields
    expect(fileTypePromptRegistry.java.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    expect(fileTypePromptRegistry.java.wrapInCodeBlock).toBe(true);
    expect(fileTypePromptRegistry.python.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    expect(fileTypePromptRegistry.python.wrapInCodeBlock).toBe(true);
  });

  test("real appSummaryConfigMap entries should have presentation fields", () => {
    // Verify that the actual config map has the new required fields
    expect(appSummaryConfigMap.technologies.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
    expect(appSummaryConfigMap.technologies.wrapInCodeBlock).toBe(false);
    expect(appSummaryConfigMap.appDescription.wrapInCodeBlock).toBe(false);
    expect(appSummaryConfigMap.boundedContexts.wrapInCodeBlock).toBe(false);
  });
});
