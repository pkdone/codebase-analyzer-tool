import { fixLlmTokenArtifacts } from "../../../../../src/common/llm/json-processing/sanitizers/index";
import { REPAIR_STEP } from "../../../../../src/common/llm/json-processing/constants/repair-steps.config";

describe("fixLlmTokenArtifacts", () => {
  describe("Vertex AI/Gemini token artifacts", () => {
    it("should remove <y_bin_XXX> markers", () => {
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(REPAIR_STEP.FIXED_LLM_TOKEN_ARTIFACTS);
      // The sanitizer now just removes the marker - property name fixing is handled by unifiedSyntaxSanitizer
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      expect(result.repairs).toBeDefined();
      expect(result.repairs?.length).toBeGreaterThan(0);
    });

    it("should handle the exact error case from InteropService log", () => {
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    {
      "name": "createTransactionRequest"`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      // The sanitizer removes the marker - property name will be fixed by unifiedSyntaxSanitizer later
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
    });

    it("should remove general binary corruption markers", () => {
      const input = `      "name": "test",
      <y_bin_123>something": "value"`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<y_bin_");
      expect(result.content).toContain('something": "value"');
      expect(result.repairs).toBeDefined();
    });

    it("should not modify binary markers inside string values", () => {
      const input = `      "description": "This contains <y_bin_305>OfCode marker in text"`;

      const result = fixLlmTokenArtifacts(input);

      // Should not change because it's inside a string
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("OpenAI-style token artifacts", () => {
    it("should remove <|endoftext|> tokens", () => {
      const input = `{
        "name": "test",
        "value": 123
      }<|endoftext|>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<|endoftext|>");
      expect(result.content).toContain('"name": "test"');
    });

    it("should remove <|im_start|> and <|im_end|> tokens", () => {
      const input = `<|im_start|>{
        "name": "test"
      }<|im_end|>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<|im_start|>");
      expect(result.content).not.toContain("<|im_end|>");
      expect(result.content).toContain('"name": "test"');
    });

    it("should remove <|assistant|> tokens", () => {
      const input = `<|assistant|>{"name": "test"}`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<|assistant|>");
      expect(result.content).toContain('"name": "test"');
    });

    it("should not modify OpenAI tokens inside string values", () => {
      const input = `{"description": "Token format: <|endoftext|>"}`;

      const result = fixLlmTokenArtifacts(input);

      // Should not change because it's inside a string
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("Common special tokens", () => {
    it("should remove <pad> tokens", () => {
      const input = `{"name": "test"}<pad><pad>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<pad>");
    });

    it("should remove <eos> tokens", () => {
      const input = `{"name": "test"}<eos>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<eos>");
    });

    it("should remove <s> and </s> tokens", () => {
      const input = `<s>{"name": "test"}</s>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<s>");
      expect(result.content).not.toContain("</s>");
    });

    it("should remove <unk> tokens", () => {
      const input = `{"name": <unk>"test"}`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<unk>");
    });
  });

  describe("BERT/Transformer token artifacts", () => {
    it("should remove [EOS] tokens", () => {
      const input = `{"name": "test"}[EOS]`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[EOS]");
      expect(result.content).toContain('"name": "test"');
    });

    it("should remove [PAD] tokens", () => {
      const input = `{"name": "test"}[PAD][PAD][PAD]`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[PAD]");
    });

    it("should remove [UNK] tokens", () => {
      const input = `{"name": [UNK]"test"}`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[UNK]");
    });

    it("should remove [CLS] and [SEP] tokens", () => {
      const input = `[CLS]{"name": "test"}[SEP]`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[CLS]");
      expect(result.content).not.toContain("[SEP]");
    });

    it("should remove [MASK] tokens", () => {
      const input = `{"name": [MASK]}`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[MASK]");
    });

    it("should not modify BERT tokens inside string values", () => {
      const input = `{"description": "Token: [EOS]"}`;

      const result = fixLlmTokenArtifacts(input);

      // Should not change because it's inside a string
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("Instruction tokens", () => {
    it("should remove [INST] and [/INST] tokens", () => {
      const input = `[INST]{"name": "test"}[/INST]`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[INST]");
      expect(result.content).not.toContain("[/INST]");
    });
  });

  describe("Mixed token artifacts", () => {
    it("should remove multiple different token types in one input", () => {
      const input = `<|im_start|>{"name": "test", "value": 123}<|endoftext|>[EOS]<pad>`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<|im_start|>");
      expect(result.content).not.toContain("<|endoftext|>");
      expect(result.content).not.toContain("[EOS]");
      expect(result.content).not.toContain("<pad>");
      expect(result.content).toContain('"name": "test"');
    });

    it("should handle token artifacts embedded in JSON structure", () => {
      const input = `{
        "items": [
          {"name": "item1"},
          <y_bin_100>{"name": "item2"},
          {"name": "item3"}<|endoftext|>
        ]
      }`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<y_bin_100>");
      expect(result.content).not.toContain("<|endoftext|>");
    });
  });

  describe("stray text before opening braces", () => {
    it("should not handle stray text before braces (moved to removeInvalidPrefixes)", () => {
      const input = `  "publicFunctions": [
    {
      "name": "test"
    },
    so{
      "name": "getKyc"
    }
  ]`;

      const result = fixLlmTokenArtifacts(input);

      // This functionality was moved to removeInvalidPrefixes sanitizer
      // This sanitizer now only handles binary markers
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("combined scenarios", () => {
    it("should fix binary corruption markers only", () => {
      const input = `  "publicFunctions": [
    {
      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    so{
      "name": "getKyc"
    }
  ]`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      // Only removes binary markers - property name fixing happens later in pipeline
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      // Stray text before braces is handled by removeInvalidPrefixes, not this sanitizer
      expect(result.content).toContain("so{");
    });

    it("should handle the full error case from the log file", () => {
      // This is a simplified version of the actual error
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    {
      "name": "createTransactionRequest",
      "purpose": "Initiates a new interoperability transaction",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    so{
      "name": "getKyc",
      "purpose": "Retrieves Know Your Customer"`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      // Removes binary marker - property name will be fixed by unifiedSyntaxSanitizer
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      // Stray text before braces is handled by removeInvalidPrefixes
      expect(result.content).toContain("so{");
    });
  });

  describe("edge cases", () => {
    it("should not modify valid JSON", () => {
      const input = `    {
      "name": "test",
      "linesOfCode": 1
    }`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle different binary marker numbers", () => {
      const input = `      <y_bin_999>OfCode": 1`;

      const result = fixLlmTokenArtifacts(input);

      expect(result.changed).toBe(true);
      // Just removes the marker - property name fixing happens later
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
    });

    it("should not handle stray text before braces (moved to removeInvalidPrefixes)", () => {
      const input = `  "publicFunctions": [
    {
      "name": "test1"
    },
    abc{
      "name": "test2"
    }
  ]`;

      const result = fixLlmTokenArtifacts(input);

      // This functionality was moved to removeInvalidPrefixes sanitizer
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
