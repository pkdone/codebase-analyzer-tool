import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { z } from "zod";

describe("unwrapJsonSchema integration with JsonProcessor.parseAndValidate", () => {
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });
  it("should handle the exact error case from the log", () => {
    // This is the exact problematic response from the error log
    const llmResponse = `{
  "type": "object",
  "properties": {
    "purpose": "This file serves as a template for generating post-release cleanup instructions for the Apache Fineract project. It provides standardized Git commands that need to be executed after a release has been finalized to maintain proper repository hygiene. The template is designed to guide developers through the process of removing temporary release branches while preserving release tags and ensuring all changes are properly merged back to the development branch. It references a specific JIRA issue (FINERACT-1154) that established the requirement for this cleanup process as part of the project's release management workflow.",
    "implementation": "The file is implemented as a FreeMarker template (.ftl) that uses variable substitution to generate personalized Git commands for each release. It utilizes the project property fineract.release.version to dynamically insert the specific release version number into the Git commands, ensuring the instructions are tailored to the current release being processed. The template generates a sequence of Git operations including checking out the develop branch, deleting local and remote release branches, creating a merge branch, and performing a recursive merge with space-ignoring strategy to handle potential whitespace conflicts. The business logic embedded in this template enforces a specific branching strategy where release branches are temporary constructs that should be cleaned up after tagging, while ensuring that any release-specific changes are merged back into the main development line. The final steps include pushing changes and creating a pull request through GitHub's hub tool, establishing a review process even for post-release maintenance tasks."
  }
}`;

    // The expected schema that was failing validation before
    const schema = z.object({
      purpose: z.string(),
      implementation: z.string(),
    });

    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
    };

    // This should now succeed because the unwrapJsonSchema sanitizer will fix it
    const result = jsonProcessor.parseAndValidate(
      llmResponse,
      "buildSrc/src/main/resources/instructions/step13.txt.ftl",
      completionOptions,
      true,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty("purpose");
      expect(result.data).toHaveProperty("implementation");
      expect(typeof (result.data as any).purpose).toBe("string");
      expect(typeof (result.data as any).implementation).toBe("string");
    }
  });

  it("should handle JSON Schema pattern with additional metadata", () => {
    const llmResponse = JSON.stringify({
      type: "object",
      description: "This is a schema description",
      required: ["field1", "field2"],
      properties: {
        field1: "value1",
        field2: "value2",
        field3: "value3",
      },
    });

    const schema = z.object({
      field1: z.string(),
      field2: z.string(),
      field3: z.string(),
    });

    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
    };

    const result = jsonProcessor.parseAndValidate(
      llmResponse,
      "test-resource",
      completionOptions,
      true,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        field1: "value1",
        field2: "value2",
        field3: "value3",
      });
    }
  });

  it("should still handle normal JSON responses without changes", () => {
    const llmResponse = JSON.stringify({
      purpose: "Normal purpose",
      implementation: "Normal implementation",
    });

    const schema = z.object({
      purpose: z.string(),
      implementation: z.string(),
    });

    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
    };

    const result = jsonProcessor.parseAndValidate(
      llmResponse,
      "test-resource",
      completionOptions,
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        purpose: "Normal purpose",
        implementation: "Normal implementation",
      });
    }
  });

  it("should handle JSON Schema wrapped in code fences", () => {
    const llmResponse = `\`\`\`json
{
  "type": "object",
  "properties": {
    "name": "John Doe",
    "age": 30
  }
}
\`\`\``;

    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
    };

    const result = jsonProcessor.parseAndValidate(
      llmResponse,
      "test-resource",
      completionOptions,
      true,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "John Doe",
        age: 30,
      });
    }
  });
});
