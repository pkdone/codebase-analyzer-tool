import { getRequiredEnvVar } from "../../src/env/env-utils";
import { BadConfigurationLLMError } from "../../src/llm/types/llm-errors.types";

describe("env-utils", () => {
  it("getRequiredEnvVar returns value when present", () => {
    const env = { KEY: "value" } as any;
    expect(getRequiredEnvVar(env, "KEY")).toBe("value");
  });

  it("getRequiredEnvVar throws when missing", () => {
    const env = {} as any;
    expect(() => getRequiredEnvVar(env, "MISSING")).toThrow(BadConfigurationLLMError);
  });
});
