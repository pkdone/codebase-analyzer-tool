import { promptManager } from "../../../src/app/prompts/prompt-registry";
const fileTypePromptMetadata = promptManager.sources;
import { sourceSummarySchema } from "../../../src/app/schemas/sources.schema";
import { fileTypePromptRegistry } from "../../../src/app/prompts/definitions/sources/sources.definitions";

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
      publicFunctions: true,
      databaseIntegration: true,
      integrationPoints: true,
      codeQualityMetrics: true,
    });

    // Compare shape keys
    const expectedKeys = Object.keys((picked as any)._def.shape());
    const actualKeys = Object.keys((pythonMeta.responseSchema as any)._def.shape());
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });

  it("should use default hasComplexSchema (undefined = false)", () => {
    // Standard code configs don't explicitly set hasComplexSchema, so it defaults to false at usage site
    expect(fileTypePromptRegistry.python.hasComplexSchema).toBeUndefined();
  });
});
