import {
  llmCaptureMetadataSchema,
  sourceSchema,
} from "../../../src/app/schemas/source-file.schema";
import { appSummarySchema } from "../../../src/app/schemas/app-summaries.schema";

describe("llmCaptureMetadataSchema", () => {
  describe("valid metadata", () => {
    it("should accept metadata with all fields", () => {
      const validMetadata = {
        completionModel: "openai/gpt-4",
        embeddingModel: "openai/text-embedding-3-small",
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionModel).toBe("openai/gpt-4");
        expect(result.data.embeddingModel).toBe("openai/text-embedding-3-small");
        expect(result.data.capturedAt).toEqual(new Date("2024-01-15T10:30:00Z"));
      }
    });

    it("should accept metadata with only required capturedAt field", () => {
      const minimalMetadata = {
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(minimalMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionModel).toBeUndefined();
        expect(result.data.embeddingModel).toBeUndefined();
        expect(result.data.capturedAt).toEqual(new Date("2024-01-15T10:30:00Z"));
      }
    });

    it("should accept metadata with only completionModel and capturedAt", () => {
      const metadataWithCompletionOnly = {
        completionModel: "vertexai/gemini-pro",
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithCompletionOnly);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionModel).toBe("vertexai/gemini-pro");
        expect(result.data.embeddingModel).toBeUndefined();
      }
    });

    it("should accept metadata with only embeddingModel and capturedAt", () => {
      const metadataWithEmbeddingOnly = {
        embeddingModel: "bedrock/titan-embed-text-v2",
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithEmbeddingOnly);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionModel).toBeUndefined();
        expect(result.data.embeddingModel).toBe("bedrock/titan-embed-text-v2");
      }
    });
  });

  describe("invalid metadata", () => {
    it("should reject metadata without capturedAt", () => {
      const metadataWithoutCapturedAt = {
        completionModel: "openai/gpt-4",
        embeddingModel: "openai/text-embedding-3-small",
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithoutCapturedAt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["capturedAt"]);
      }
    });

    it("should reject metadata with invalid capturedAt type", () => {
      const metadataWithInvalidDate = {
        completionModel: "openai/gpt-4",
        capturedAt: "not-a-date",
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithInvalidDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["capturedAt"]);
      }
    });

    it("should reject metadata with invalid completionModel type", () => {
      const metadataWithInvalidModel = {
        completionModel: 123,
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithInvalidModel);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["completionModel"]);
        expect(result.error.issues[0].code).toBe("invalid_type");
      }
    });

    it("should reject metadata with invalid embeddingModel type", () => {
      const metadataWithInvalidEmbedding = {
        embeddingModel: { model: "invalid" },
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithInvalidEmbedding);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["embeddingModel"]);
        expect(result.error.issues[0].code).toBe("invalid_type");
      }
    });
  });

  describe("passthrough behavior", () => {
    it("should allow additional properties due to passthrough", () => {
      const metadataWithExtra = {
        completionModel: "openai/gpt-4",
        embeddingModel: "openai/text-embedding-3-small",
        capturedAt: new Date("2024-01-15T10:30:00Z"),
        extraField: "extra-value",
      };

      const result = llmCaptureMetadataSchema.safeParse(metadataWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).extraField).toBe("extra-value");
      }
    });
  });
});

describe("sourceSchema with llmCapture", () => {
  const validSourceBase = {
    projectName: "test-project",
    filename: "test.ts",
    filepath: "src/test.ts",
    fileExtension: "ts",
    linesCount: 100,
    content: "// test content",
  };

  it("should accept source without llmCapture (optional)", () => {
    const result = sourceSchema.safeParse(validSourceBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.llmCapture).toBeUndefined();
    }
  });

  it("should accept source with llmCapture metadata", () => {
    const sourceWithLlmCapture = {
      ...validSourceBase,
      llmCapture: {
        completionModel: "openai/gpt-4",
        embeddingModel: "openai/text-embedding-3-small",
        capturedAt: new Date("2024-01-15T10:30:00Z"),
      },
    };

    const result = sourceSchema.safeParse(sourceWithLlmCapture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.llmCapture).toBeDefined();
      expect(result.data.llmCapture?.completionModel).toBe("openai/gpt-4");
      expect(result.data.llmCapture?.embeddingModel).toBe("openai/text-embedding-3-small");
      expect(result.data.llmCapture?.capturedAt).toEqual(new Date("2024-01-15T10:30:00Z"));
    }
  });

  it("should reject source with invalid llmCapture (missing capturedAt)", () => {
    const sourceWithInvalidLlmCapture = {
      ...validSourceBase,
      llmCapture: {
        completionModel: "openai/gpt-4",
        // missing capturedAt
      },
    };

    const result = sourceSchema.safeParse(sourceWithInvalidLlmCapture);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("llmCapture");
    }
  });
});

describe("appSummarySchema with capturedAt", () => {
  const validAppSummaryBase = {
    projectName: "test-project",
    llmModels: "gpt-4, text-embedding-3-small",
  };

  it("should accept app summary without capturedAt (optional)", () => {
    const result = appSummarySchema.safeParse(validAppSummaryBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capturedAt).toBeUndefined();
    }
  });

  it("should accept app summary with capturedAt timestamp", () => {
    const appSummaryWithTimestamp = {
      ...validAppSummaryBase,
      capturedAt: new Date("2024-01-15T10:30:00Z"),
    };

    const result = appSummarySchema.safeParse(appSummaryWithTimestamp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capturedAt).toEqual(new Date("2024-01-15T10:30:00Z"));
    }
  });

  it("should reject app summary with invalid capturedAt type", () => {
    const appSummaryWithInvalidTimestamp = {
      ...validAppSummaryBase,
      capturedAt: "not-a-date",
    };

    const result = appSummarySchema.safeParse(appSummaryWithInvalidTimestamp);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["capturedAt"]);
    }
  });
});
