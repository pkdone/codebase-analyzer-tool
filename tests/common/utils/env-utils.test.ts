import { getRequiredEnvVar } from "../../../src/env/env-utils";
import { EnvVars } from "../../../src/env/env.types";

describe("getRequiredEnvVar", () => {
  it("should be importable from env", () => {
    expect(getRequiredEnvVar).toBeDefined();
    expect(typeof getRequiredEnvVar).toBe("function");
  });

  it("should return value for valid environment variable", () => {
    const mockEnv: Partial<EnvVars> = {
      TEST_VAR: "test-value",
    };
    expect(getRequiredEnvVar(mockEnv as EnvVars, "TEST_VAR")).toBe("test-value");
  });

  it("should throw error for missing environment variable", () => {
    const mockEnv: Partial<EnvVars> = {};
    expect(() => getRequiredEnvVar(mockEnv as EnvVars, "MISSING_VAR")).toThrow(
      "Required environment variable 'MISSING_VAR' is missing or not a non-empty string",
    );
  });

  it("should throw error for empty string environment variable", () => {
    const mockEnv: Partial<EnvVars> = {
      EMPTY_VAR: "",
    };
    expect(() => getRequiredEnvVar(mockEnv as EnvVars, "EMPTY_VAR")).toThrow(
      "Required environment variable 'EMPTY_VAR' is missing or not a non-empty string",
    );
  });

  it("should throw error for undefined environment variable", () => {
    const mockEnv: Partial<EnvVars> = {
      UNDEFINED_VAR: undefined,
    };
    expect(() => getRequiredEnvVar(mockEnv as EnvVars, "UNDEFINED_VAR")).toThrow(
      "Required environment variable 'UNDEFINED_VAR' is missing or not a non-empty string",
    );
  });

  it("should throw error with correct error message format", () => {
    const mockEnv: Partial<EnvVars> = {};
    try {
      getRequiredEnvVar(mockEnv as EnvVars, "TEST_KEY");
      fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("TEST_KEY");
      expect((error as Error).message).toContain("Key: TEST_KEY");
    }
  });

  it("should work with various valid string values", () => {
    const mockEnv: Partial<EnvVars> = {
      VAR1: "simple",
      VAR2: "with spaces",
      VAR3: "with-dashes-and_underscores",
      VAR4: "123456",
      VAR5: "special!@#$%chars",
    };

    expect(getRequiredEnvVar(mockEnv as EnvVars, "VAR1")).toBe("simple");
    expect(getRequiredEnvVar(mockEnv as EnvVars, "VAR2")).toBe("with spaces");
    expect(getRequiredEnvVar(mockEnv as EnvVars, "VAR3")).toBe("with-dashes-and_underscores");
    expect(getRequiredEnvVar(mockEnv as EnvVars, "VAR4")).toBe("123456");
    expect(getRequiredEnvVar(mockEnv as EnvVars, "VAR5")).toBe("special!@#$%chars");
  });
});
