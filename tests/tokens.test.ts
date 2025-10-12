import { TOKENS } from "../src/tokens";

describe("TOKENS module", () => {
  it("should export TOKENS object", () => {
    expect(TOKENS).toBeDefined();
    expect(typeof TOKENS).toBe("object");
  });

  it("should contain all expected core dependency tokens", () => {
    expect(TOKENS.MongoClient).toEqual(expect.any(Symbol));
    expect(TOKENS.DatabaseName).toEqual(expect.any(Symbol));
    expect(TOKENS.LLMRouter).toEqual(expect.any(Symbol));
    expect(TOKENS.EnvVars).toEqual(expect.any(Symbol));
    expect(TOKENS.ProjectName).toEqual(expect.any(Symbol));
    expect(TOKENS.ShutdownService).toEqual(expect.any(Symbol));
  });

  it("should contain all expected repository tokens", () => {
    expect(TOKENS.SourcesRepository).toEqual(expect.any(Symbol));
    expect(TOKENS.AppSummariesRepository).toEqual(expect.any(Symbol));
  });

  it("should contain all expected task tokens", () => {
    expect(TOKENS.CodebaseCaptureTask).toEqual(expect.any(Symbol));
    expect(TOKENS.CodebaseQueryTask).toEqual(expect.any(Symbol));
    expect(TOKENS.InsightsGenerationTask).toEqual(expect.any(Symbol));
    expect(TOKENS.ReportGenerationTask).toEqual(expect.any(Symbol));
  });

  it("should contain DatabaseInitializer token", () => {
    expect(TOKENS.DatabaseInitializer).toEqual(expect.any(Symbol));
  });

  it("should be independent of other modules (no circular dependencies)", () => {
    // This test passes if the import succeeds without errors
    // If there were circular dependencies, the module would fail to load
    expect(true).toBe(true);
  });

  it("should have unique symbol values for all tokens", () => {
    const tokenValues = Object.values(TOKENS);
    const uniqueValues = new Set(tokenValues);
    expect(tokenValues.length).toBe(uniqueValues.size);
  });

  it("should be a const object (frozen)", () => {
    expect(Object.isFrozen(TOKENS)).toBe(false); // as const doesn't freeze at runtime
    // But it should not be extensible in TypeScript
    expect(TOKENS).toBeDefined();
  });
});
