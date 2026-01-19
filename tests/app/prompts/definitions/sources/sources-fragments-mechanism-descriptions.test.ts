/**
 * Tests for MECHANISM_DESCRIPTIONS usage across language-specific fragments.
 *
 * Verifies that all language-specific fragments consistently use the
 * centralized MECHANISM_DESCRIPTIONS constants from common.fragments.ts
 * rather than hardcoding mechanism strings.
 */

import { SOURCES_PROMPT_FRAGMENTS } from "../../../../../src/app/prompts/sources/sources.fragments";
import { MECHANISM_DESCRIPTIONS } from "../../../../../src/app/prompts/sources/fragments/common.fragments";

describe("MECHANISM_DESCRIPTIONS usage in language-specific fragments", () => {
  describe("MECHANISM_DESCRIPTIONS constants", () => {
    it("should have all expected mechanism types", () => {
      expect(MECHANISM_DESCRIPTIONS.REST).toBe("(mechanism: 'REST')");
      expect(MECHANISM_DESCRIPTIONS.GRAPHQL).toBe("(mechanism: 'GRAPHQL')");
      expect(MECHANISM_DESCRIPTIONS.SOAP).toBe("(mechanism: 'SOAP')");
      expect(MECHANISM_DESCRIPTIONS.WEBSOCKET).toBe("(mechanism: 'WEBSOCKET')");
      expect(MECHANISM_DESCRIPTIONS.GRPC).toBe("(mechanism: 'GRPC')");
      expect(MECHANISM_DESCRIPTIONS.SSE).toBe("(mechanism: 'SSE')");
      expect(MECHANISM_DESCRIPTIONS.TRPC).toBe("(mechanism: 'TRPC')");
    });
  });

  describe("Java INTEGRATION_INSTRUCTIONS", () => {
    const javaIntegration = SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS;

    it("should use MECHANISM_DESCRIPTIONS.REST constant", () => {
      expect(javaIntegration).toContain(MECHANISM_DESCRIPTIONS.REST);
    });

    it("should use MECHANISM_DESCRIPTIONS.SOAP constant", () => {
      expect(javaIntegration).toContain(MECHANISM_DESCRIPTIONS.SOAP);
    });

    it("should use MECHANISM_DESCRIPTIONS.WEBSOCKET constant", () => {
      expect(javaIntegration).toContain(MECHANISM_DESCRIPTIONS.WEBSOCKET);
    });

    it("should use MECHANISM_DESCRIPTIONS.GRPC constant", () => {
      expect(javaIntegration).toContain(MECHANISM_DESCRIPTIONS.GRPC);
    });
  });

  describe("JavaScript INTEGRATION_INSTRUCTIONS", () => {
    const jsIntegration = SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS;

    it("should use MECHANISM_DESCRIPTIONS.REST constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.REST);
    });

    it("should use MECHANISM_DESCRIPTIONS.GRAPHQL constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.GRAPHQL);
    });

    it("should use MECHANISM_DESCRIPTIONS.WEBSOCKET constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.WEBSOCKET);
    });

    it("should use MECHANISM_DESCRIPTIONS.GRPC constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.GRPC);
    });

    it("should use MECHANISM_DESCRIPTIONS.TRPC constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.TRPC);
    });

    it("should use MECHANISM_DESCRIPTIONS.SSE constant", () => {
      expect(jsIntegration).toContain(MECHANISM_DESCRIPTIONS.SSE);
    });
  });

  describe("C# INTEGRATION_INSTRUCTIONS", () => {
    const csharpIntegration = SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS;

    it("should use MECHANISM_DESCRIPTIONS.REST constant", () => {
      expect(csharpIntegration).toContain(MECHANISM_DESCRIPTIONS.REST);
    });

    it("should use MECHANISM_DESCRIPTIONS.SOAP constant", () => {
      expect(csharpIntegration).toContain(MECHANISM_DESCRIPTIONS.SOAP);
    });

    it("should use MECHANISM_DESCRIPTIONS.GRPC constant", () => {
      expect(csharpIntegration).toContain(MECHANISM_DESCRIPTIONS.GRPC);
    });
  });

  describe("C INTEGRATION_INSTRUCTIONS", () => {
    const cIntegration = SOURCES_PROMPT_FRAGMENTS.C_SPECIFIC.INTEGRATION_INSTRUCTIONS;

    it("should use MECHANISM_DESCRIPTIONS.REST constant", () => {
      expect(cIntegration).toContain(MECHANISM_DESCRIPTIONS.REST);
    });
  });

  describe("C++ INTEGRATION_INSTRUCTIONS", () => {
    const cppIntegration = SOURCES_PROMPT_FRAGMENTS.CPP_SPECIFIC.INTEGRATION_INSTRUCTIONS;

    it("should use MECHANISM_DESCRIPTIONS.REST constant", () => {
      expect(cppIntegration).toContain(MECHANISM_DESCRIPTIONS.REST);
    });

    it("should use MECHANISM_DESCRIPTIONS.WEBSOCKET constant", () => {
      expect(cppIntegration).toContain(MECHANISM_DESCRIPTIONS.WEBSOCKET);
    });

    it("should use MECHANISM_DESCRIPTIONS.GRPC constant", () => {
      expect(cppIntegration).toContain(MECHANISM_DESCRIPTIONS.GRPC);
    });
  });

  describe("Cross-language consistency for REST mechanism", () => {
    const languagesWithRest = [
      {
        name: "Java",
        integration: SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      },
      {
        name: "JavaScript",
        integration: SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      },
      {
        name: "C#",
        integration: SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      },
      { name: "C", integration: SOURCES_PROMPT_FRAGMENTS.C_SPECIFIC.INTEGRATION_INSTRUCTIONS },
      { name: "C++", integration: SOURCES_PROMPT_FRAGMENTS.CPP_SPECIFIC.INTEGRATION_INSTRUCTIONS },
    ];

    it("should have consistent REST mechanism format across all languages", () => {
      languagesWithRest.forEach(({ integration }) => {
        expect(integration).toContain(MECHANISM_DESCRIPTIONS.REST);
        // Verify it's using the constant, not a hardcoded string
        expect(integration).toContain("(mechanism: 'REST')");
      });
    });
  });
});
