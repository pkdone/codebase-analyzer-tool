import {
  LLAMA_BEGIN_TOKEN,
  LLAMA_HEADER_START_TOKEN,
  LLAMA_HEADER_END_TOKEN,
  LLAMA_EOT_TOKEN,
  LLAMA_SYSTEM_MESSAGE,
} from "../../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.constants";

describe("Bedrock Llama Constants", () => {
  describe("LLAMA_BEGIN_TOKEN", () => {
    it("should be defined", () => {
      expect(LLAMA_BEGIN_TOKEN).toBeDefined();
    });

    it("should be the correct Llama begin token", () => {
      expect(LLAMA_BEGIN_TOKEN).toBe("<|begin_of_text|>");
    });

    it("should follow the Llama token format", () => {
      expect(LLAMA_BEGIN_TOKEN).toMatch(/^<\|.+\|>$/);
    });
  });

  describe("LLAMA_HEADER_START_TOKEN", () => {
    it("should be defined", () => {
      expect(LLAMA_HEADER_START_TOKEN).toBeDefined();
    });

    it("should be the correct Llama header start token", () => {
      expect(LLAMA_HEADER_START_TOKEN).toBe("<|start_header_id|>");
    });

    it("should follow the Llama token format", () => {
      expect(LLAMA_HEADER_START_TOKEN).toMatch(/^<\|.+\|>$/);
    });
  });

  describe("LLAMA_HEADER_END_TOKEN", () => {
    it("should be defined", () => {
      expect(LLAMA_HEADER_END_TOKEN).toBeDefined();
    });

    it("should be the correct Llama header end token", () => {
      expect(LLAMA_HEADER_END_TOKEN).toBe("<|end_header_id|>");
    });

    it("should follow the Llama token format", () => {
      expect(LLAMA_HEADER_END_TOKEN).toMatch(/^<\|.+\|>$/);
    });
  });

  describe("LLAMA_EOT_TOKEN", () => {
    it("should be defined", () => {
      expect(LLAMA_EOT_TOKEN).toBeDefined();
    });

    it("should be the correct Llama end-of-turn token", () => {
      expect(LLAMA_EOT_TOKEN).toBe("<|eot_id|>");
    });

    it("should follow the Llama token format", () => {
      expect(LLAMA_EOT_TOKEN).toMatch(/^<\|.+\|>$/);
    });
  });

  describe("LLAMA_SYSTEM_MESSAGE", () => {
    it("should be defined", () => {
      expect(LLAMA_SYSTEM_MESSAGE).toBeDefined();
    });

    it("should be a non-empty string", () => {
      expect(typeof LLAMA_SYSTEM_MESSAGE).toBe("string");
      expect(LLAMA_SYSTEM_MESSAGE.length).toBeGreaterThan(0);
    });

    it("should contain software engineering context", () => {
      const lowerMessage = LLAMA_SYSTEM_MESSAGE.toLowerCase();
      expect(lowerMessage).toContain("software engineering");
    });

    it("should contain programming context", () => {
      const lowerMessage = LLAMA_SYSTEM_MESSAGE.toLowerCase();
      expect(lowerMessage).toContain("programming");
    });

    it("should indicate assistant role", () => {
      const lowerMessage = LLAMA_SYSTEM_MESSAGE.toLowerCase();
      expect(lowerMessage).toContain("assistant");
    });
  });

  describe("constants usage in chat template", () => {
    it("should allow building a valid Llama chat format", () => {
      const systemRole = "system";
      const userRole = "user";
      const assistantRole = "assistant";
      const userPrompt = "Hello, world!";

      const formattedPrompt = `${LLAMA_BEGIN_TOKEN}${LLAMA_HEADER_START_TOKEN}${systemRole}${LLAMA_HEADER_END_TOKEN}
${LLAMA_SYSTEM_MESSAGE}${LLAMA_EOT_TOKEN}
${LLAMA_HEADER_START_TOKEN}${userRole}${LLAMA_HEADER_END_TOKEN}${userPrompt}${LLAMA_EOT_TOKEN}${LLAMA_HEADER_START_TOKEN}${assistantRole}${LLAMA_HEADER_END_TOKEN}`;

      // Verify the template has all expected parts
      expect(formattedPrompt).toContain(LLAMA_BEGIN_TOKEN);
      expect(formattedPrompt).toContain(LLAMA_HEADER_START_TOKEN);
      expect(formattedPrompt).toContain(LLAMA_HEADER_END_TOKEN);
      expect(formattedPrompt).toContain(LLAMA_EOT_TOKEN);
      expect(formattedPrompt).toContain(LLAMA_SYSTEM_MESSAGE);
      expect(formattedPrompt).toContain(userPrompt);
    });
  });
});
