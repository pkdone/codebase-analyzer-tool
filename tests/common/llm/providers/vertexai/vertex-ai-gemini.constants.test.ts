import {
  VERTEXAI_API_ENDPOINT,
  VERTEXAI_TERMINAL_FINISH_REASONS,
  VERTEXAI_GLOBAL_LOCATION,
} from "../../../../../src/common/llm/providers/vertexai/vertex-ai-gemini/vertex-ai-gemini.constants";
import { FinishReason } from "@google-cloud/vertexai";

describe("Vertex AI Gemini Constants", () => {
  describe("VERTEXAI_API_ENDPOINT", () => {
    it("should be defined", () => {
      expect(VERTEXAI_API_ENDPOINT).toBeDefined();
    });

    it("should be the correct GCP aiplatform domain", () => {
      expect(VERTEXAI_API_ENDPOINT).toBe("aiplatform.googleapis.com");
    });

    it("should be a valid domain string", () => {
      expect(typeof VERTEXAI_API_ENDPOINT).toBe("string");
      expect(VERTEXAI_API_ENDPOINT).toMatch(/^[a-z.]+$/);
    });
  });

  describe("VERTEXAI_TERMINAL_FINISH_REASONS", () => {
    it("should be defined and non-empty", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toBeDefined();
      expect(VERTEXAI_TERMINAL_FINISH_REASONS.length).toBeGreaterThan(0);
    });

    it("should contain BLOCKLIST finish reason", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toContain(FinishReason.BLOCKLIST);
    });

    it("should contain PROHIBITED_CONTENT finish reason", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toContain(FinishReason.PROHIBITED_CONTENT);
    });

    it("should contain RECITATION finish reason", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toContain(FinishReason.RECITATION);
    });

    it("should contain SAFETY finish reason", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toContain(FinishReason.SAFETY);
    });

    it("should contain SPII finish reason", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).toContain(FinishReason.SPII);
    });

    it("should NOT contain STOP finish reason (successful completion)", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS).not.toContain(FinishReason.STOP);
    });

    it("should be usable with Array.includes for checking terminal states", () => {
      expect(VERTEXAI_TERMINAL_FINISH_REASONS.includes(FinishReason.SAFETY)).toBe(true);
      expect(VERTEXAI_TERMINAL_FINISH_REASONS.includes(FinishReason.STOP)).toBe(false);
    });
  });

  describe("VERTEXAI_GLOBAL_LOCATION", () => {
    it("should be defined", () => {
      expect(VERTEXAI_GLOBAL_LOCATION).toBeDefined();
    });

    it("should be the string 'global'", () => {
      expect(VERTEXAI_GLOBAL_LOCATION).toBe("global");
    });

    it("should be usable for location comparison", () => {
      const getGlobalLocation = (): string => "global";
      expect(getGlobalLocation() === VERTEXAI_GLOBAL_LOCATION).toBe(true);

      const getRegionalLocation = (): string => "us-central1";
      expect(getRegionalLocation() === VERTEXAI_GLOBAL_LOCATION).toBe(false);
    });
  });
});

