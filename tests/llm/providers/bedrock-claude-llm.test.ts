import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests for BedrockClaudeLLM anthropic_beta configuration
 */
describe("BedrockClaudeLLM", () => {
  it("should read anthropic_beta flags from manifest config", () => {
    // Verify the manifest has the anthropicBetaFlags configuration
    const manifestPath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest.ts",
    );
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");

    // Verify the config includes anthropicBetaFlags
    expect(manifestContent).toContain("anthropicBetaFlags");
    expect(manifestContent).toContain("context-1m-2025-08-07");
  });

  it("should use config.anthropicBetaFlags in LLM implementation", () => {
    const llmPath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude-llm.ts",
    );
    const llmContent = fs.readFileSync(llmPath, "utf-8");

    // Verify the implementation uses config.anthropicBetaFlags
    expect(llmContent).toContain("config.anthropicBetaFlags");
    expect(llmContent).toContain("AWS_COMPLETIONS_CLAUDE_V40");
    expect(llmContent).toContain("AWS_COMPLETIONS_CLAUDE_V45");
    expect(llmContent).toContain(".includes(modelKey)");
  });
});
