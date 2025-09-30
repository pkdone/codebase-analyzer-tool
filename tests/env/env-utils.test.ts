import { getRequiredEnvVar, isDefined } from "../../src/env/env-utils";
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

  it("isDefined filters out null and undefined", () => {
    const arr = ["a", undefined, null, "b"].filter(isDefined);
    expect(arr).toEqual(["a", "b"]);
  });
});
