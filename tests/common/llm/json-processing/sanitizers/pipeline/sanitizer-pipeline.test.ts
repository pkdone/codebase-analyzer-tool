/**
 * Tests for the sanitizer pipeline infrastructure.
 */

import {
  executePipeline,
  createPipeline,
  createEmptyResult,
  toSanitizerResult,
  type SanitizerStrategy,
} from "../../../../../../src/common/llm/json-processing/sanitizers/pipeline";

describe("sanitizer-pipeline", () => {
  describe("createEmptyResult", () => {
    it("should create a result with unchanged content", () => {
      const result = createEmptyResult("test content");
      expect(result.content).toBe("test content");
      expect(result.changed).toBe(false);
      expect(result.diagnostics).toEqual([]);
    });
  });

  describe("executePipeline", () => {
    it("should return unchanged result for empty input", () => {
      const mockStrategy: SanitizerStrategy = {
        name: "MockStrategy",
        apply: jest.fn().mockReturnValue({ content: "", changed: false, diagnostics: [] }),
      };

      const result = executePipeline([mockStrategy], "");
      expect(result.content).toBe("");
      expect(result.changed).toBe(false);
      expect(mockStrategy.apply).not.toHaveBeenCalled();
    });

    it("should execute strategies in order", () => {
      const callOrder: string[] = [];

      const strategy1: SanitizerStrategy = {
        name: "Strategy1",
        apply: (input) => {
          callOrder.push("Strategy1");
          return { content: input + "-1", changed: true, diagnostics: ["Applied 1"] };
        },
      };

      const strategy2: SanitizerStrategy = {
        name: "Strategy2",
        apply: (input) => {
          callOrder.push("Strategy2");
          return { content: input + "-2", changed: true, diagnostics: ["Applied 2"] };
        },
      };

      const result = executePipeline([strategy1, strategy2], "start");

      expect(callOrder).toEqual(["Strategy1", "Strategy2"]);
      expect(result.content).toBe("start-1-2");
      expect(result.changed).toBe(true);
      expect(result.appliedStrategies).toEqual(["Strategy1", "Strategy2"]);
    });

    it("should aggregate diagnostics from all strategies", () => {
      const strategy1: SanitizerStrategy = {
        name: "Strategy1",
        apply: () => ({
          content: "test",
          changed: true,
          diagnostics: ["Diag 1", "Diag 2"],
        }),
      };

      const strategy2: SanitizerStrategy = {
        name: "Strategy2",
        apply: () => ({
          content: "test",
          changed: true,
          diagnostics: ["Diag 3"],
        }),
      };

      const result = executePipeline([strategy1, strategy2], "input");

      expect(result.diagnostics).toEqual([
        "[Strategy1] Diag 1",
        "[Strategy1] Diag 2",
        "[Strategy2] Diag 3",
      ]);
    });

    it("should skip strategies that make no changes", () => {
      const strategy1: SanitizerStrategy = {
        name: "Strategy1",
        apply: (input) => ({ content: input, changed: false, diagnostics: [] }),
      };

      const strategy2: SanitizerStrategy = {
        name: "Strategy2",
        apply: (input) => ({
          content: input + "-modified",
          changed: true,
          diagnostics: ["Changed"],
        }),
      };

      const result = executePipeline([strategy1, strategy2], "test");

      expect(result.appliedStrategies).toEqual(["Strategy2"]);
      expect(result.content).toBe("test-modified");
    });

    it("should continue on error when configured", () => {
      const errorStrategy: SanitizerStrategy = {
        name: "ErrorStrategy",
        apply: () => {
          throw new Error("Test error");
        },
      };

      const workingStrategy: SanitizerStrategy = {
        name: "WorkingStrategy",
        apply: (input) => ({
          content: input + "-fixed",
          changed: true,
          diagnostics: ["Fixed"],
        }),
      };

      const result = executePipeline(
        [errorStrategy, workingStrategy],
        "test",
        undefined,
        { continueOnError: true },
      );

      expect(result.content).toBe("test-fixed");
      expect(result.appliedStrategies).toEqual(["WorkingStrategy"]);
    });

    it("should throw on error when continueOnError is false", () => {
      const errorStrategy: SanitizerStrategy = {
        name: "ErrorStrategy",
        apply: () => {
          throw new Error("Test error");
        },
      };

      expect(() =>
        executePipeline([errorStrategy], "test", undefined, { continueOnError: false }),
      ).toThrow("Test error");
    });

    it("should limit diagnostics per strategy", () => {
      const manyDiagnostics = Array.from({ length: 50 }, (_, i) => `Diag ${i}`);
      const strategy: SanitizerStrategy = {
        name: "Strategy",
        apply: () => ({
          content: "test",
          changed: true,
          diagnostics: manyDiagnostics,
        }),
      };

      const result = executePipeline([strategy], "input", undefined, {
        maxDiagnosticsPerStrategy: 5,
      });

      expect(result.diagnostics?.length).toBe(5);
    });
  });

  describe("createPipeline", () => {
    it("should create a reusable pipeline function", () => {
      const strategy: SanitizerStrategy = {
        name: "Strategy",
        apply: (input) => ({
          content: input.toUpperCase(),
          changed: true,
          diagnostics: ["Uppercased"],
        }),
      };

      const pipeline = createPipeline([strategy]);

      const result1 = pipeline("hello");
      const result2 = pipeline("world");

      expect(result1.content).toBe("HELLO");
      expect(result2.content).toBe("WORLD");
    });
  });

  describe("toSanitizerResult", () => {
    it("should convert pipeline result to sanitizer result format", () => {
      const pipelineResult = {
        content: "test",
        changed: true,
        description: "Test description",
        diagnostics: ["Diag 1"],
        appliedStrategies: ["Strategy1"],
      };

      const sanitizerResult = toSanitizerResult(pipelineResult);

      expect(sanitizerResult.content).toBe("test");
      expect(sanitizerResult.changed).toBe(true);
      expect(sanitizerResult.description).toBe("Test description");
      expect(sanitizerResult.diagnostics).toEqual(["Diag 1"]);
    });
  });
});

