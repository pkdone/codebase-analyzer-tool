import { VERTEXAI_CLAUDE_ERROR_PATTERNS } from "../../../../../../src/common/llm/providers/vertexai/claude/vertex-ai-claude-error-patterns";
import { defaultVertexAIClaudeProviderConfig } from "../../../../../../src/common/llm/providers/vertexai/claude/vertex-ai-claude-defaults.config";

describe("VertexAI Claude LLM", () => {
  describe("VERTEXAI_CLAUDE_ERROR_PATTERNS", () => {
    it("should match prompt too long error pattern", () => {
      const errorMessage = "prompt is too long: 250000 tokens > 200000 maximum";
      const pattern = VERTEXAI_CLAUDE_ERROR_PATTERNS[0].pattern;
      const match = errorMessage.match(pattern);

      expect(match).not.toBeNull();
      expect(match?.groups?.prompt).toBe("250000");
      expect(match?.groups?.max).toBe("200000");
    });

    it("should match with varying whitespace in prompt too long error", () => {
      const errorMessage = "prompt is too long:  150000  tokens  >  100000  maximum";
      const pattern = VERTEXAI_CLAUDE_ERROR_PATTERNS[0].pattern;
      const match = errorMessage.match(pattern);

      expect(match).not.toBeNull();
      expect(match?.groups?.prompt).toBe("150000");
      expect(match?.groups?.max).toBe("100000");
    });

    it("should have correct units for all patterns", () => {
      for (const pattern of VERTEXAI_CLAUDE_ERROR_PATTERNS) {
        expect(pattern.units).toBe("tokens");
      }
    });

    it("should match request too large error pattern", () => {
      const errorMessage = "request too large: 500000 tokens exceeds limit of 200000";
      const pattern = VERTEXAI_CLAUDE_ERROR_PATTERNS[2].pattern;
      const match = errorMessage.match(pattern);

      expect(match).not.toBeNull();
    });
  });

  describe("defaultVertexAIClaudeProviderConfig", () => {
    it("should have timeout under SDK streaming limit", () => {
      // Must be under 10 minutes (SDK limit for non-streaming requests)
      expect(defaultVertexAIClaudeProviderConfig.requestTimeoutMillis).toBe(9.5 * 60 * 1000);
    });

    it("should have appropriate retry delays", () => {
      expect(defaultVertexAIClaudeProviderConfig.minRetryDelayMillis).toBe(30 * 1000);
      expect(defaultVertexAIClaudeProviderConfig.maxRetryDelayMillis).toBe(200 * 1000);
    });

    it("should have retry attempts configured", () => {
      expect(defaultVertexAIClaudeProviderConfig.maxRetryAttempts).toBeGreaterThan(0);
    });
  });
});
