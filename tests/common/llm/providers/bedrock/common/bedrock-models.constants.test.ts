import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
  createTitanEmbeddingsConfig,
  createBedrockEnvSchema,
} from "../../../../../../src/common/llm/providers/bedrock/common/bedrock-models.constants";
import { LLMPurpose } from "../../../../../../src/common/llm/types/llm-request.types";
import { BEDROCK_CLAUDE_FAMILY } from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import { BEDROCK_LLAMA_FAMILY } from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama.manifest";
import { BEDROCK_MISTRAL_FAMILY } from "../../../../../../src/common/llm/providers/bedrock/mistral/bedrock-mistral.manifest";
import { BEDROCK_NOVA_FAMILY } from "../../../../../../src/common/llm/providers/bedrock/nova/bedrock-nova.manifest";
import { BEDROCK_DEEPSEEK_FAMILY } from "../../../../../../src/common/llm/providers/bedrock/deepseek/bedrock-deepseek.manifest";

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

  describe("createTitanEmbeddingsConfig", () => {
    it("should create config with default dimensions (1024)", () => {
      const config = createTitanEmbeddingsConfig();

      expect(config).toEqual({
        modelKey: AWS_EMBEDDINGS_TITAN_V1,
        name: "Titan Embeddings v1",
        urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1024,
        maxTotalTokens: 8192,
      });
    });

    it("should create config with custom dimensions", () => {
      const config = createTitanEmbeddingsConfig(1536);

      expect(config.dimensions).toBe(1536);
      expect(config.modelKey).toBe(AWS_EMBEDDINGS_TITAN_V1);
    });

    it("should always use the same modelKey and urnEnvKey", () => {
      const config1 = createTitanEmbeddingsConfig(1024);
      const config2 = createTitanEmbeddingsConfig(1536);

      expect(config1.modelKey).toBe(config2.modelKey);
      expect(config1.urnEnvKey).toBe(config2.urnEnvKey);
    });

    it("should have purpose set to EMBEDDINGS", () => {
      const config = createTitanEmbeddingsConfig();

      expect(config.purpose).toBe(LLMPurpose.EMBEDDINGS);
    });
  });

  describe("createBedrockEnvSchema", () => {
    it("should include BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY by default", () => {
      const schema = createBedrockEnvSchema({});
      const shape = schema.shape;

      expect(shape[BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]).toBeDefined();
    });

    it("should include additional keys passed in", () => {
      const customKey = "MY_CUSTOM_KEY";
      const schema = createBedrockEnvSchema({
        [customKey]: z.string().min(1),
      });
      const shape = schema.shape as Record<string, unknown>;

      expect(shape[BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]).toBeDefined();
      expect(shape[customKey]).toBeDefined();
    });

    it("should validate successfully with valid data", () => {
      const schema = createBedrockEnvSchema({
        MY_KEY: z.string().min(1),
      });

      const result = schema.safeParse({
        [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: "model-urn",
        MY_KEY: "value",
      });

      expect(result.success).toBe(true);
    });

    it("should fail validation when BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY is missing", () => {
      const schema = createBedrockEnvSchema({});

      const result = schema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should fail validation when additional required key is missing", () => {
      const schema = createBedrockEnvSchema({
        MY_REQUIRED_KEY: z.string().min(1),
      });

      const result = schema.safeParse({
        [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: "model-urn",
      });

      expect(result.success).toBe(false);
    });
  });
});
