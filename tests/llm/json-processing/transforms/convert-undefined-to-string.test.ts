import { convertUndefinedToString } from "../../../../src/llm/json-processing/transforms/convert-undefined-to-string.js";

describe("convertUndefinedToString", () => {
  it("should convert undefined to empty string for known required string properties", () => {
    const input = {
      name: undefined,
      type: "CLASS",
      purpose: undefined,
    };

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      name: "",
      type: "CLASS",
      purpose: "",
    });
  });

  it("should handle nested objects", () => {
    const input = {
      publicMethods: [
        {
          name: undefined,
          returnType: "String",
        },
      ],
      publicConstants: [
        {
          name: undefined,
          value: "CONSTANT",
        },
      ],
    };

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      publicMethods: [
        {
          name: "",
          returnType: "String",
        },
      ],
      publicConstants: [
        {
          name: "",
          value: "CONSTANT",
        },
      ],
    });
  });

  it("should not convert undefined for non-required properties", () => {
    const input = {
      name: "TestClass",
      someOtherProperty: undefined,
    };

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      name: "TestClass",
      someOtherProperty: undefined,
    });
  });

  it("should handle case-insensitive property names", () => {
    const input = {
      Name: undefined,
      TYPE: undefined,
      Purpose: undefined,
    };

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      Name: "",
      TYPE: "",
      Purpose: "",
    });
  });

  it("should handle arrays", () => {
    const input = [
      { name: undefined, type: "METHOD" },
      { name: "test", type: undefined },
    ];

    const result = convertUndefinedToString(input);

    expect(result).toEqual([
      { name: "", type: "METHOD" },
      { name: "test", type: "" },
    ]);
  });

  it("should handle null values", () => {
    const input = {
      name: null,
      type: "CLASS",
    };

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      name: null,
      type: "CLASS",
    });
  });

  it("should handle primitives", () => {
    expect(convertUndefinedToString("string")).toBe("string");
    expect(convertUndefinedToString(123)).toBe(123);
    expect(convertUndefinedToString(true)).toBe(true);
    expect(convertUndefinedToString(null)).toBeNull();
  });

  it("should handle circular references safely", () => {
    const input: Record<string, unknown> = {
      name: undefined,
      type: "CLASS",
    };
    input.self = input;

    const result = convertUndefinedToString(input);

    expect(result).toEqual({
      name: "",
      type: "CLASS",
      self: expect.any(Object),
    });
  });
});

