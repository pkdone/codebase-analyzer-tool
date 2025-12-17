import { getRequiredEnvVar } from "../../../src/app/env/env-utils";
import { ConfigurationError } from "../../../src/app/env/env-errors";
import { EnvVars } from "../../../src/app/env/env.types";

describe("getRequiredEnvVar", () => {
  it("should return the value when environment variable exists and is non-empty string", () => {
    const env = {
      TEST_VAR: "test-value",
    } as unknown as EnvVars;

    const result = getRequiredEnvVar(env, "TEST_VAR");
    expect(result).toBe("test-value");
  });

  it("should throw ConfigurationError when environment variable is missing", () => {
    const env = {} as unknown as EnvVars;

    expect(() => getRequiredEnvVar(env, "MISSING_VAR")).toThrow(ConfigurationError);
    expect(() => getRequiredEnvVar(env, "MISSING_VAR")).toThrow(
      /Required environment variable 'MISSING_VAR' is missing/,
    );
  });

  it("should throw ConfigurationError when environment variable is empty string", () => {
    const env = {
      EMPTY_VAR: "",
    } as unknown as EnvVars;

    expect(() => getRequiredEnvVar(env, "EMPTY_VAR")).toThrow(ConfigurationError);
    expect(() => getRequiredEnvVar(env, "EMPTY_VAR")).toThrow(
      /Required environment variable 'EMPTY_VAR' is missing/,
    );
  });

  it("should throw ConfigurationError when environment variable is not a string", () => {
    const env: EnvVars = {
      NON_STRING_VAR: 123,
    } as any;

    expect(() => getRequiredEnvVar(env, "NON_STRING_VAR")).toThrow(ConfigurationError);
    expect(() => getRequiredEnvVar(env, "NON_STRING_VAR")).toThrow(
      /Required environment variable 'NON_STRING_VAR' is missing/,
    );
  });

  it("should include key and value in error message", () => {
    const env: EnvVars = {
      TEST_VAR: null,
    } as any;

    try {
      getRequiredEnvVar(env, "TEST_VAR");
      fail("Should have thrown ConfigurationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toContain("TEST_VAR");
      expect(errorMessage).toContain("null");
    }
  });
});
