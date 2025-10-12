import { getRequiredEnvVar } from "../../../src/env/utils/env-utils";

describe("env-utils", () => {
  it("getRequiredEnvVar returns value when present", () => {
    const env = { KEY: "value" } as any;
    expect(getRequiredEnvVar(env, "KEY")).toBe("value");
  });

  it("getRequiredEnvVar throws when missing", () => {
    const env = {} as any;
    expect(() => getRequiredEnvVar(env, "MISSING")).toThrow(Error);
    expect(() => getRequiredEnvVar(env, "MISSING")).toThrow(
      /Required environment variable 'MISSING' is missing/,
    );
  });

  it("getRequiredEnvVar throws when value is empty string", () => {
    const env = { EMPTY: "" } as any;
    expect(() => getRequiredEnvVar(env, "EMPTY")).toThrow(Error);
  });

  it("getRequiredEnvVar throws when value is not a string", () => {
    const env = { NUMBER: 123 } as any;
    expect(() => getRequiredEnvVar(env, "NUMBER")).toThrow(Error);
  });
});
