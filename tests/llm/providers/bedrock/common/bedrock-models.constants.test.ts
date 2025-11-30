import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../../../../../src/llm/providers/bedrock/common/bedrock-models.constants";
import { BEDROCK_CLAUDE_FAMILY } from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";
import { BEDROCK_LLAMA_FAMILY } from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import { BEDROCK_MISTRAL_FAMILY } from "../../../../../src/llm/providers/bedrock/bedrockMistral/bedrock-mistral.manifest";
import { BEDROCK_NOVA_FAMILY } from "../../../../../src/llm/providers/bedrock/bedrockNova/bedrock-nova.manifest";
import { BEDROCK_DEEPSEEK_FAMILY } from "../../../../../src/llm/providers/bedrock/bedrockDeepseek/bedrock-deepseek.manifest";

describe("bedrock-models.constants", () => {
  describe("environment variable name constants", () => {
    it("should have BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY defined", () => {
      expect(BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY).toBeDefined();
      expect(BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY).toBe("BEDROCK_TITAN_EMBEDDINGS_MODEL");
    });
  });

  describe("model internal key constants", () => {
    it("should have AWS_EMBEDDINGS_TITAN_V1 defined", () => {
      expect(AWS_EMBEDDINGS_TITAN_V1).toBeDefined();
      expect(AWS_EMBEDDINGS_TITAN_V1).toBe("AWS_EMBEDDINGS_TITAN_V1");
    });
  });

  describe("model family constants", () => {
    it("should have BEDROCK_CLAUDE_FAMILY defined", () => {
      expect(BEDROCK_CLAUDE_FAMILY).toBeDefined();
      expect(BEDROCK_CLAUDE_FAMILY).toBe("BedrockClaude");
    });

    it("should have BEDROCK_LLAMA_FAMILY defined", () => {
      expect(BEDROCK_LLAMA_FAMILY).toBeDefined();
      expect(BEDROCK_LLAMA_FAMILY).toBe("BedrockLlama");
    });

    it("should have BEDROCK_MISTRAL_FAMILY defined", () => {
      expect(BEDROCK_MISTRAL_FAMILY).toBeDefined();
      expect(BEDROCK_MISTRAL_FAMILY).toBe("BedrockMistral");
    });

    it("should have BEDROCK_NOVA_FAMILY defined", () => {
      expect(BEDROCK_NOVA_FAMILY).toBeDefined();
      expect(BEDROCK_NOVA_FAMILY).toBe("BedrockNova");
    });

    it("should have BEDROCK_DEEPSEEK_FAMILY defined", () => {
      expect(BEDROCK_DEEPSEEK_FAMILY).toBeDefined();
      expect(BEDROCK_DEEPSEEK_FAMILY).toBe("BedrockDeepseek");
    });

    it("should have unique family names", () => {
      const families = [
        BEDROCK_CLAUDE_FAMILY,
        BEDROCK_LLAMA_FAMILY,
        BEDROCK_MISTRAL_FAMILY,
        BEDROCK_NOVA_FAMILY,
        BEDROCK_DEEPSEEK_FAMILY,
      ];
      const uniqueFamilies = new Set(families);
      expect(uniqueFamilies.size).toBe(families.length);
    });

    it("should all start with 'Bedrock' prefix", () => {
      expect(BEDROCK_CLAUDE_FAMILY).toMatch(/^Bedrock/);
      expect(BEDROCK_LLAMA_FAMILY).toMatch(/^Bedrock/);
      expect(BEDROCK_MISTRAL_FAMILY).toMatch(/^Bedrock/);
      expect(BEDROCK_NOVA_FAMILY).toMatch(/^Bedrock/);
      expect(BEDROCK_DEEPSEEK_FAMILY).toMatch(/^Bedrock/);
    });
  });
});
