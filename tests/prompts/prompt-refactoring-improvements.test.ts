import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
} from "../../src/prompts/definitions/sources/sources.fragments";
import { FORCE_JSON_FORMAT, BASE_PROMPT_TEMPLATE } from "../../src/prompts/templates";
import { renderPrompt } from "../../src/prompts/prompt-renderer";
import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";
import { codebaseQueryPromptDefinition } from "../../src/prompts/definitions/utility-prompts";

describe("Prompt Refactoring Improvements", () => {
  describe("FORCE_JSON_FORMAT location", () => {
    test("FORCE_JSON_FORMAT should be exported from templates.ts", () => {
      expect(FORCE_JSON_FORMAT).toBeDefined();
      expect(typeof FORCE_JSON_FORMAT).toBe("string");
      expect(FORCE_JSON_FORMAT).toContain("The response MUST be valid JSON");
      expect(FORCE_JSON_FORMAT).toContain("Only include JSON");
      expect(FORCE_JSON_FORMAT).toContain("All property names must be quoted");
    });

    test("FORCE_JSON_FORMAT should contain comprehensive JSON formatting rules", () => {
      // Verify key formatting rules are present
      expect(FORCE_JSON_FORMAT).toContain("start directly with { or [");
      expect(FORCE_JSON_FORMAT).toContain("No markdown formatting");
      expect(FORCE_JSON_FORMAT).toContain("proper JSON syntax");
      expect(FORCE_JSON_FORMAT).toContain("ASCII only");
      expect(FORCE_JSON_FORMAT).toContain("Escape control characters");
    });
  });

  describe("COMPOSITES object structure", () => {
    test("COMPOSITES should export all instruction sets", () => {
      expect(COMPOSITES).toBeDefined();
      expect(COMPOSITES.CODE_QUALITY).toBeDefined();
      expect(COMPOSITES.DB_INTEGRATION).toBeDefined();
      expect(COMPOSITES.INTEGRATION_POINTS).toBeDefined();
      expect(COMPOSITES.SCHEDULED_JOBS).toBeDefined();
    });

    test("COMPOSITES.CODE_QUALITY should contain correct fragments", () => {
      expect(COMPOSITES.CODE_QUALITY).toHaveLength(4);
      expect(COMPOSITES.CODE_QUALITY[0]).toBe(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.INTRO);
      expect(COMPOSITES.CODE_QUALITY[1]).toBe(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_METRICS);
      expect(COMPOSITES.CODE_QUALITY[2]).toBe(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_SMELLS);
      expect(COMPOSITES.CODE_QUALITY[3]).toBe(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.FILE_METRICS);
    });

    test("COMPOSITES.DB_INTEGRATION should contain correct fragments", () => {
      expect(COMPOSITES.DB_INTEGRATION).toHaveLength(2);
      expect(COMPOSITES.DB_INTEGRATION[0]).toBe(SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO);
      expect(COMPOSITES.DB_INTEGRATION[1]).toBe(
        SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS,
      );
    });

    test("COMPOSITES.INTEGRATION_POINTS should contain correct fragments", () => {
      expect(COMPOSITES.INTEGRATION_POINTS).toHaveLength(1);
      expect(COMPOSITES.INTEGRATION_POINTS[0]).toBe(
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
      );
    });

    test("COMPOSITES.SCHEDULED_JOBS should contain correct fragments", () => {
      expect(COMPOSITES.SCHEDULED_JOBS).toHaveLength(2);
      expect(COMPOSITES.SCHEDULED_JOBS[0]).toBe(SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO);
      expect(COMPOSITES.SCHEDULED_JOBS[1]).toBe(SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS);
    });
  });

  describe("sources.config.ts uses COMPOSITES correctly", () => {
    test("Java prompt metadata should use COMPOSITES fragments", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      expect(javaMetadata).toBeDefined();
      expect(javaMetadata.instructions).toBeDefined();
      expect(javaMetadata.instructions.length).toBeGreaterThan(0);

      // Check that the instructions contain the expected content from COMPOSITES
      const allInstructions = javaMetadata.instructions.join("\n");
      expect(allInstructions).toContain("Code Quality Analysis");
      expect(allInstructions).toContain("Database Integration Analysis");
    });

    test("JavaScript prompt metadata should use COMPOSITES fragments", () => {
      const jsMetadata = fileTypePromptMetadata.javascript;
      expect(jsMetadata).toBeDefined();
      expect(jsMetadata.instructions).toBeDefined();
      expect(jsMetadata.instructions.length).toBeGreaterThan(0);

      const allInstructions = jsMetadata.instructions.join("\n");
      expect(allInstructions).toContain("Code Quality Analysis");
      expect(allInstructions).toContain("Database Integration Analysis");
    });

    test("All major source file types should have consistent instruction structure", () => {
      const fileTypes = ["java", "javascript", "csharp", "python", "ruby"] as const;

      fileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType];
        const allInstructions = metadata.instructions.join("\n");

        // All should have these key sections
        expect(allInstructions).toContain("__Basic Information__");
        expect(allInstructions).toContain("__Code Quality Metrics__");
        expect(allInstructions).toContain("__Database Integration Analysis__");
      });
    });
  });

  describe("nullish coalescing in prompt-renderer", () => {
    test("renderPrompt should handle undefined partialAnalysisNote", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "test code", partialAnalysisNote: undefined };

      expect(() => {
        const rendered = renderPrompt(definition, data);
        expect(rendered).toBeTruthy();
      }).not.toThrow();
    });

    test("renderPrompt should handle null partialAnalysisNote", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "test code", partialAnalysisNote: null };

      expect(() => {
        const rendered = renderPrompt(definition, data);
        expect(rendered).toBeTruthy();
      }).not.toThrow();
    });

    test("renderPrompt should handle missing partialAnalysisNote", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "test code" };

      expect(() => {
        const rendered = renderPrompt(definition, data);
        expect(rendered).toBeTruthy();
      }).not.toThrow();
    });

    test("renderPrompt should use string partialAnalysisNote when provided", () => {
      const definition = fileTypePromptMetadata.java;
      const note = "This is a test note.";
      const data = { content: "test code", partialAnalysisNote: note };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // Note: The BASE_PROMPT_TEMPLATE uses {{partialAnalysisNote}} placeholder
      // which will be replaced with the note value
    });

    test("renderPrompt should handle non-string partialAnalysisNote gracefully", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "test code", partialAnalysisNote: 123 as any };

      expect(() => {
        const rendered = renderPrompt(definition, data);
        expect(rendered).toBeTruthy();
      }).not.toThrow();
    });
  });

  describe("codebaseQueryPromptDefinition has explicit template", () => {
    test("codebaseQueryPromptDefinition should have template property", () => {
      expect(codebaseQueryPromptDefinition.template).toBeDefined();
      expect(typeof codebaseQueryPromptDefinition.template).toBe("string");
    });

    test("codebaseQueryPromptDefinition template should contain expected structure", () => {
      const template = codebaseQueryPromptDefinition.template;
      expect(template).toContain("Act as a senior developer");
      expect(template).toContain("QUESTION:");
      expect(template).toContain("CODE:");
      expect(template).toContain("{{question}}");
      expect(template).toContain("{{content}}");
    });

    test("codebaseQueryPromptDefinition should be self-contained", () => {
      // All required properties should be present
      expect(codebaseQueryPromptDefinition.label).toBeDefined();
      expect(codebaseQueryPromptDefinition.introTextTemplate).toBeDefined();
      expect(codebaseQueryPromptDefinition.instructions).toBeDefined();
      expect(codebaseQueryPromptDefinition.responseSchema).toBeDefined();
      expect(codebaseQueryPromptDefinition.template).toBeDefined();
      expect(codebaseQueryPromptDefinition.dataBlockHeader).toBeDefined();
      expect(codebaseQueryPromptDefinition.wrapInCodeBlock).toBeDefined();
    });
  });

  describe("Integration: rendered prompts remain unchanged", () => {
    test("Java prompt rendering should produce expected output structure", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "public class Test {}" };

      const rendered = renderPrompt(definition, data);

      // Should contain all key sections
      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("JVM code");
      expect(rendered).toContain("__Basic Information__");
      expect(rendered).toContain("__Code Quality Metrics__");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("public class Test {}");
    });

    test("JavaScript prompt rendering should produce expected output structure", () => {
      const definition = fileTypePromptMetadata.javascript;
      const data = { content: "export const test = () => {}" };

      const rendered = renderPrompt(definition, data);

      // Should contain all key sections
      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("JavaScript/TypeScript code");
      expect(rendered).toContain("__Basic Information__");
      expect(rendered).toContain("__Code Quality Metrics__");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("export const test = () => {}");
    });

    test("SQL prompt rendering should produce expected output structure", () => {
      const definition = fileTypePromptMetadata.sql;
      const data = { content: "CREATE TABLE test (id INT);" };

      const rendered = renderPrompt(definition, data);

      // Should contain all key sections
      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("database DDL/DML/SQL code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("CREATE TABLE test (id INT);");
    });
  });

  describe("BASE_PROMPT_TEMPLATE uses FORCE_JSON_FORMAT", () => {
    test("BASE_PROMPT_TEMPLATE should have placeholder for forceJSON", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("{{forceJSON}}");
    });

    test("rendered prompts should include FORCE_JSON_FORMAT content", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: "test code" };

      const rendered = renderPrompt(definition, data);

      // Should contain content from FORCE_JSON_FORMAT
      expect(rendered).toContain("The response MUST be valid JSON");
      expect(rendered).toContain("All property names must be quoted");
    });
  });
});
