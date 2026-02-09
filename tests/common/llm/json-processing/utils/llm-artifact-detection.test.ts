/**
 * Unit tests for LLM artifact detection utility.
 */

import {
  isLLMArtifactPropertyName,
  shouldRemoveAsLLMArtifact,
  isLLMArtifactOrInternalProperty,
} from "../../../../../src/common/llm/json-processing/utils/llm-artifact-detection";

describe("llm-artifact-detection", () => {
  describe("isLLMArtifactPropertyName", () => {
    describe("prefix patterns", () => {
      it("should detect extra_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("extra_thoughts")).toBe(true);
        expect(isLLMArtifactPropertyName("extra_text")).toBe(true);
        expect(isLLMArtifactPropertyName("extra_notes")).toBe(true);
      });

      it("should detect llm_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("llm_reasoning")).toBe(true);
        expect(isLLMArtifactPropertyName("llm_analysis")).toBe(true);
      });

      it("should detect ai_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("ai_response")).toBe(true);
        expect(isLLMArtifactPropertyName("ai_output")).toBe(true);
      });

      it("should detect model_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("model_thoughts")).toBe(true);
        expect(isLLMArtifactPropertyName("model_output")).toBe(true);
      });

      it("should detect gpt_, claude_, gemini_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("gpt_response")).toBe(true);
        expect(isLLMArtifactPropertyName("claude_analysis")).toBe(true);
        expect(isLLMArtifactPropertyName("gemini_output")).toBe(true);
      });

      it("should detect debug_, temp_, tmp_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("debug_info")).toBe(true);
        expect(isLLMArtifactPropertyName("temp_data")).toBe(true);
        expect(isLLMArtifactPropertyName("tmp_value")).toBe(true);
      });

      it("should detect internal_, private_, hidden_ prefixed properties", () => {
        expect(isLLMArtifactPropertyName("internal_state")).toBe(true);
        expect(isLLMArtifactPropertyName("private_field")).toBe(true);
        expect(isLLMArtifactPropertyName("hidden_value")).toBe(true);
      });
    });

    describe("underscore prefix pattern", () => {
      it("should detect properties starting with underscore", () => {
        expect(isLLMArtifactPropertyName("_internal")).toBe(true);
        expect(isLLMArtifactPropertyName("_meta")).toBe(true);
        expect(isLLMArtifactPropertyName("_private_data")).toBe(true);
      });

      it("should not detect single underscore", () => {
        expect(isLLMArtifactPropertyName("_")).toBe(false);
      });
    });

    describe("suffix patterns", () => {
      it("should detect _thoughts and _thought suffixes", () => {
        expect(isLLMArtifactPropertyName("my_thoughts")).toBe(true);
        expect(isLLMArtifactPropertyName("initial_thought")).toBe(true);
      });

      it("should detect _thinking and _reasoning suffixes", () => {
        expect(isLLMArtifactPropertyName("chain_thinking")).toBe(true);
        expect(isLLMArtifactPropertyName("step_reasoning")).toBe(true);
      });

      it("should detect _analysis and _scratchpad suffixes", () => {
        expect(isLLMArtifactPropertyName("code_analysis")).toBe(true);
        expect(isLLMArtifactPropertyName("work_scratchpad")).toBe(true);
      });

      it("should detect _notes, _note, _comment suffixes", () => {
        expect(isLLMArtifactPropertyName("dev_notes")).toBe(true);
        expect(isLLMArtifactPropertyName("side_note")).toBe(true);
        expect(isLLMArtifactPropertyName("inline_comment")).toBe(true);
      });

      it("should detect _metadata and _internal suffixes", () => {
        expect(isLLMArtifactPropertyName("response_metadata")).toBe(true);
        expect(isLLMArtifactPropertyName("data_internal")).toBe(true);
      });

      it("should detect _response, _output, _trace suffixes", () => {
        expect(isLLMArtifactPropertyName("api_response")).toBe(true);
        expect(isLLMArtifactPropertyName("model_output")).toBe(true);
        expect(isLLMArtifactPropertyName("execution_trace")).toBe(true);
      });
    });

    describe("compound artifact patterns", () => {
      it("should detect chain_of_thought pattern", () => {
        expect(isLLMArtifactPropertyName("chain_of_thought")).toBe(true);
        expect(isLLMArtifactPropertyName("myChainOfThought")).toBe(true);
      });

      it("should detect reasoning_trace pattern", () => {
        expect(isLLMArtifactPropertyName("reasoning_trace")).toBe(true);
      });

      it("should detect working_memory pattern", () => {
        expect(isLLMArtifactPropertyName("working_memory")).toBe(true);
      });

      it("should detect step_by_step pattern", () => {
        expect(isLLMArtifactPropertyName("step_by_step")).toBe(true);
        expect(isLLMArtifactPropertyName("my_step_by_step_analysis")).toBe(true);
      });
    });

    describe("non-artifact properties", () => {
      it("should not detect normal property names", () => {
        expect(isLLMArtifactPropertyName("name")).toBe(false);
        expect(isLLMArtifactPropertyName("description")).toBe(false);
        expect(isLLMArtifactPropertyName("value")).toBe(false);
        expect(isLLMArtifactPropertyName("items")).toBe(false);
      });

      it("should not detect camelCase properties", () => {
        expect(isLLMArtifactPropertyName("firstName")).toBe(false);
        expect(isLLMArtifactPropertyName("lastName")).toBe(false);
        expect(isLLMArtifactPropertyName("userProfile")).toBe(false);
      });

      it("should not detect snake_case properties without artifact patterns", () => {
        expect(isLLMArtifactPropertyName("user_name")).toBe(false);
        expect(isLLMArtifactPropertyName("file_path")).toBe(false);
        expect(isLLMArtifactPropertyName("created_at")).toBe(false);
      });
    });
  });

  describe("shouldRemoveAsLLMArtifact", () => {
    describe("without knownProperties", () => {
      it("should use pattern-based detection when knownProperties is undefined", () => {
        expect(shouldRemoveAsLLMArtifact("extra_thoughts", undefined)).toBe(true);
        expect(shouldRemoveAsLLMArtifact("name", undefined)).toBe(false);
      });

      it("should use pattern-based detection when knownProperties is empty", () => {
        expect(shouldRemoveAsLLMArtifact("llm_notes", [])).toBe(true);
        expect(shouldRemoveAsLLMArtifact("description", [])).toBe(false);
      });
    });

    describe("with knownProperties", () => {
      const knownProperties = ["name", "description", "items", "purpose"];

      it("should not remove known properties even if they match artifact patterns", () => {
        const customKnown = ["extra_data", "internal_id"];
        expect(shouldRemoveAsLLMArtifact("extra_data", customKnown)).toBe(false);
        expect(shouldRemoveAsLLMArtifact("internal_id", customKnown)).toBe(false);
      });

      it("should remove unknown properties that match artifact patterns", () => {
        expect(shouldRemoveAsLLMArtifact("extra_thoughts", knownProperties)).toBe(true);
        expect(shouldRemoveAsLLMArtifact("llm_reasoning", knownProperties)).toBe(true);
      });

      it("should not remove unknown properties that do not match patterns", () => {
        expect(shouldRemoveAsLLMArtifact("unknownField", knownProperties)).toBe(false);
        expect(shouldRemoveAsLLMArtifact("customProperty", knownProperties)).toBe(false);
      });

      it("should be case-insensitive for known property matching", () => {
        expect(shouldRemoveAsLLMArtifact("NAME", knownProperties)).toBe(false);
        expect(shouldRemoveAsLLMArtifact("Description", knownProperties)).toBe(false);
        expect(shouldRemoveAsLLMArtifact("ITEMS", knownProperties)).toBe(false);
      });
    });
  });

  describe("isLLMArtifactOrInternalProperty", () => {
    it("should return true for LLM artifact properties", () => {
      expect(isLLMArtifactOrInternalProperty("extra_thoughts")).toBe(true);
      expect(isLLMArtifactOrInternalProperty("llm_reasoning")).toBe(true);
      expect(isLLMArtifactOrInternalProperty("_internal")).toBe(true);
    });

    it("should return true for codeSmells property (special case)", () => {
      expect(isLLMArtifactOrInternalProperty("codeSmells")).toBe(true);
      expect(isLLMArtifactOrInternalProperty("CODESMELLS")).toBe(true);
    });

    it("should return false for normal properties", () => {
      expect(isLLMArtifactOrInternalProperty("name")).toBe(false);
      expect(isLLMArtifactOrInternalProperty("description")).toBe(false);
      expect(isLLMArtifactOrInternalProperty("items")).toBe(false);
    });
  });
});
