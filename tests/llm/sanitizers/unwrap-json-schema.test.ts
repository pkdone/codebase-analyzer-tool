import { unwrapJsonSchema } from "../../../src/llm/json-processing/sanitizers/unwrap-json-schema";

describe("unwrapJsonSchema sanitizer", () => {
  describe("when LLM returns JSON Schema instead of data", () => {
    it("unwraps JSON Schema with type and properties", () => {
      const input = JSON.stringify(
        {
          type: "object",
          properties: {
            purpose: "This is the purpose",
            implementation: "This is the implementation",
          },
        },
        null,
        2,
      );

      const { content, changed, description } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      expect(description).toMatch(/unwrapped json schema/i);

      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        purpose: "This is the purpose",
        implementation: "This is the implementation",
      });
    });

    it("unwraps the exact case from the error log", () => {
      // This is the actual problematic response from the error log
      const input = `{
  "type": "object",
  "properties": {
    "purpose": "This file serves as a template for generating post-release cleanup instructions for the Apache Fineract project. It provides standardized Git commands that need to be executed after a release has been finalized to maintain proper repository hygiene. The template is designed to guide developers through the process of removing temporary release branches while preserving release tags and ensuring all changes are properly merged back to the development branch. It references a specific JIRA issue (FINERACT-1154) that established the requirement for this cleanup process as part of the project's release management workflow.",
    "implementation": "The file is implemented as a FreeMarker template (.ftl) that uses variable substitution to generate personalized Git commands for each release. It utilizes the project property fineract.release.version to dynamically insert the specific release version number into the Git commands, ensuring the instructions are tailored to the current release being processed. The template generates a sequence of Git operations including checking out the develop branch, deleting local and remote release branches, creating a merge branch, and performing a recursive merge with space-ignoring strategy to handle potential whitespace conflicts. The business logic embedded in this template enforces a specific branching strategy where release branches are temporary constructs that should be cleaned up after tagging, while ensuring that any release-specific changes are merged back into the main development line. The final steps include pushing changes and creating a pull request through GitHub's hub tool, establishing a review process even for post-release maintenance tasks."
  }
}`;

      const { content, changed, description } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      expect(description).toMatch(/unwrapped json schema/i);

      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("purpose");
      expect(parsed).toHaveProperty("implementation");
      expect(parsed).not.toHaveProperty("type");
      expect(parsed).not.toHaveProperty("properties");
      expect(typeof parsed.purpose).toBe("string");
      expect(typeof parsed.implementation).toBe("string");
    });

    it("unwraps JSON Schema with nested object properties", () => {
      const input = JSON.stringify({
        type: "object",
        properties: {
          user: {
            name: "John",
            age: 30,
          },
          metadata: {
            timestamp: "2025-10-03",
          },
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        user: {
          name: "John",
          age: 30,
        },
        metadata: {
          timestamp: "2025-10-03",
        },
      });
    });

    it("unwraps JSON Schema with array properties", () => {
      const input = JSON.stringify({
        type: "object",
        properties: {
          items: [1, 2, 3],
          tags: ["tag1", "tag2"],
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        items: [1, 2, 3],
        tags: ["tag1", "tag2"],
      });
    });
  });

  describe("edge cases that should not be transformed", () => {
    it("leaves valid data object unchanged", () => {
      const input = JSON.stringify({
        purpose: "This is the purpose",
        implementation: "This is the implementation",
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves object without type field unchanged", () => {
      const input = JSON.stringify({
        properties: {
          field: "value",
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves object without properties field unchanged", () => {
      const input = JSON.stringify({
        type: "object",
        field: "value",
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves JSON Schema with type other than object unchanged", () => {
      const input = JSON.stringify({
        type: "string",
        properties: {
          field: "value",
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves object with empty properties unchanged", () => {
      const input = JSON.stringify({
        type: "object",
        properties: {},
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves object with null properties unchanged", () => {
      const input = JSON.stringify({
        type: "object",
        properties: null,
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves object with array properties unchanged", () => {
      const input = JSON.stringify({
        type: "object",
        properties: [1, 2, 3],
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves array unchanged", () => {
      const input = JSON.stringify([{ field: "value" }]);

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves invalid JSON unchanged", () => {
      const input = '{"invalid": json}';

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves non-JSON string unchanged", () => {
      const input = "This is not JSON at all";

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });

    it("leaves empty string unchanged", () => {
      const input = "";

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(false);
      expect(content).toBe(input);
    });
  });

  describe("JSON Schema with additional metadata fields", () => {
    it("unwraps JSON Schema with description field", () => {
      const input = JSON.stringify({
        type: "object",
        description: "This is a schema description",
        properties: {
          field: "value",
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        field: "value",
      });
      expect(parsed).not.toHaveProperty("description");
    });

    it("unwraps JSON Schema with required field", () => {
      const input = JSON.stringify({
        type: "object",
        required: ["field1", "field2"],
        properties: {
          field1: "value1",
          field2: "value2",
        },
      });

      const { content, changed } = unwrapJsonSchema(input);

      expect(changed).toBe(true);
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        field1: "value1",
        field2: "value2",
      });
      expect(parsed).not.toHaveProperty("required");
    });
  });
});
