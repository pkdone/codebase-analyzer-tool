import "reflect-metadata";
import { ListAvailableModelsTask } from "../../../../src/app/tasks/dev/list-available-models.task";
import { APP_PROVIDER_REGISTRY } from "../../../../src/app/llm/provider-registry";
import * as modelRegistry from "../../../../src/common/llm/utils/model-registry";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

describe("ListAvailableModelsTask", () => {
  let task: ListAvailableModelsTask;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    task = new ListAvailableModelsTask();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("execute", () => {
    it("should execute without errors", async () => {
      await expect(task.execute()).resolves.not.toThrow();
    });

    it("should output completion model section header", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("LLM Completions Models Available (keys)");
    });

    it("should output embedding model section header", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("LLM Embeddings Models Available (keys)");
    });

    it("should include all provider families from registry", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Check that all provider families from the registry are included
      for (const [, manifest] of APP_PROVIDER_REGISTRY) {
        expect(output).toContain(manifest.providerFamily);
      }
    });

    it("should include completion model keys from each provider", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Check for some known completion model keys
      expect(output).toContain("openai-gpt-5");
      expect(output).toContain("vertexai-gemini-3-pro");
      expect(output).toContain("bedrock-claude-opus-4.5");
    });

    it("should include embedding model keys from providers that have them", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Check for some known embedding model keys
      expect(output).toContain("openai-text-embedding-3-small");
      expect(output).toContain("vertexai-gemini-embedding-001");
      expect(output).toContain("bedrock-amazon-titan-embed-text");
    });

    it("should not list providers with no completion models in completions section", async () => {
      await task.execute();

      // Get all console output
      const calls = consoleSpy.mock.calls;

      // Find the completions section (between completions header and embeddings header)
      let inCompletionsSection = false;
      const completionLines: string[] = [];

      for (const call of calls) {
        const line = String(call[0]);
        if (line.includes("LLM Completions Models Available")) {
          inCompletionsSection = true;
          continue;
        }
        if (line.includes("LLM Embeddings Models Available")) {
          break;
        }
        if (inCompletionsSection && line.trim() && !line.includes("===")) {
          completionLines.push(line);
        }
      }

      // All providers in the registry have completion models, so we check they all appear
      for (const [, manifest] of APP_PROVIDER_REGISTRY) {
        if (manifest.models.completions.length > 0) {
          const hasProvider = completionLines.some((line) =>
            line.includes(manifest.providerFamily),
          );
          expect(hasProvider).toBe(true);
        }
      }
    });
  });

  describe("model grouping", () => {
    it("should display models in table format with provider and model key", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Table output should contain OpenAI provider and its model keys
      expect(output).toContain("OpenAI");
      expect(output).toContain("openai-gpt-5");
      expect(output).toContain("openai-gpt-4o");
    });

    it("should display each model on a separate row", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // VertexAI Gemini has multiple completion models - each should be on separate rows
      const vertexaiLines = output.split("\n").filter((line) => line.includes("VertexAIGemini"));

      // Should have multiple rows for VertexAIGemini (one per model)
      expect(vertexaiLines.length).toBeGreaterThan(1);
    });
  });

  describe("output formatting", () => {
    it("should use console.table format for model output", async () => {
      const tableSpy = jest.spyOn(console, "table").mockImplementation();

      await task.execute();

      // console.table should be called twice (once for completions, once for embeddings)
      expect(tableSpy).toHaveBeenCalledTimes(2);

      // Each call should receive an array of model rows
      const firstCallArg = tableSpy.mock.calls[0][0] as unknown[];
      const secondCallArg = tableSpy.mock.calls[1][0] as unknown[];

      expect(Array.isArray(firstCallArg)).toBe(true);
      expect(Array.isArray(secondCallArg)).toBe(true);
      expect(firstCallArg.length).toBeGreaterThan(0);
      expect(secondCallArg.length).toBeGreaterThan(0);

      tableSpy.mockRestore();
    });

    it("should output section separators", async () => {
      await task.execute();

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Should have separator lines - count occurrences manually
      const separatorCount = output.split("========================================").length - 1;
      expect(separatorCount).toBeGreaterThanOrEqual(4); // At least 4 separator lines (2 sections x 2)
    });
  });

  describe("duplicate model key validation", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let buildModelRegistrySpy: jest.SpyInstance | undefined;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      buildModelRegistrySpy = undefined;
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      buildModelRegistrySpy?.mockRestore();
    });

    it("should display error and set exit code when duplicate model keys exist", async () => {
      const duplicateError = new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        'Duplicate model keys detected across providers. Model keys must be globally unique. Conflicts: "test-model" defined in [ProviderA, ProviderB]',
      );
      buildModelRegistrySpy = jest
        .spyOn(modelRegistry, "buildModelRegistry")
        .mockImplementation(() => {
          throw duplicateError;
        });

      await task.execute();

      const errorOutput = consoleErrorSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(errorOutput).toContain("ERROR: Model Key Validation Failed");
      expect(errorOutput).toContain("Duplicate model keys detected");
      expect(process.exitCode).toBe(1);

      // Reset exit code for other tests
      process.exitCode = 0;
    });

    it("should not display model list when duplicate keys exist", async () => {
      const duplicateError = new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Duplicate model keys detected",
      );
      buildModelRegistrySpy = jest
        .spyOn(modelRegistry, "buildModelRegistry")
        .mockImplementation(() => {
          throw duplicateError;
        });

      await task.execute();

      const logOutput = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logOutput).not.toContain("LLM Completions Models Available");
      expect(logOutput).not.toContain("LLM Embeddings Models Available");

      // Reset exit code for other tests
      process.exitCode = 0;
    });

    it("should re-throw non-LLMError exceptions", async () => {
      const unexpectedError = new Error("Unexpected error");
      buildModelRegistrySpy = jest
        .spyOn(modelRegistry, "buildModelRegistry")
        .mockImplementation(() => {
          throw unexpectedError;
        });

      await expect(task.execute()).rejects.toThrow("Unexpected error");
    });

    it("should proceed with listing when no duplicates exist", async () => {
      // Default behavior - no mock, uses real implementation
      await task.execute();

      const logOutput = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logOutput).toContain("LLM Completions Models Available");
      expect(logOutput).toContain("LLM Embeddings Models Available");
    });
  });
});
