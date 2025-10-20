import { fileTypePromptMetadata } from "../../src/promptTemplates/sources.prompts";
import { sourceSummarySchema } from "../../src/schemas/sources.schema";

describe("Python prompt metadata schema", () => {
  it("should define python entry with expected response schema fields", () => {
    const pythonMeta = fileTypePromptMetadata.python;
    expect(pythonMeta).toBeDefined();
    const picked = sourceSummarySchema.pick({
      name: true,
      kind: true,
      namespace: true,
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      publicConstants: true,
      publicMethods: true,
      databaseIntegration: true,
      integrationPoints: true,
      codeQualityMetrics: true,
    });

    // Compare shape keys
    const expectedKeys = Object.keys((picked as any)._def.shape());
    const actualKeys = Object.keys((pythonMeta.responseSchema as any)._def.shape());
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });

  it("should mark hasComplexSchema as true", () => {
    expect(fileTypePromptMetadata.python.hasComplexSchema).toBe(true);
  });
});
