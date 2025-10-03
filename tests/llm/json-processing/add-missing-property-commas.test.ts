import { addMissingPropertyCommas } from "../../../src/llm/json-processing/sanitizers/add-missing-property-commas";

describe("addMissingPropertyCommas sanitizer", () => {
  it("returns unchanged result for valid JSON with commas", () => {
    const input = '{"a":"value1","b":"value2"}';
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("adds missing comma between two string properties on separate lines", () => {
    const input = `{
  "prop1": "value1"
  "prop2": "value2"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('"prop1": "value1",');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("handles the XBRL controller case from error log", () => {
    const input = `{
  "purpose": "This file implements an XBRL controller",
  "implementation": "The implementation follows the AngularJS controller pattern and initializes several scope variables to manage XBRL taxonomy data"
  "internalReferences": [],
  "externalReferences": ["mifosX"]
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain(
      '"implementation": "The implementation follows the AngularJS controller pattern and initializes several scope variables to manage XBRL taxonomy data",',
    );
    // Verify the result is valid JSON
    expect(() => JSON.parse(result.content)).not.toThrow();
    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveProperty("purpose");
    expect(parsed).toHaveProperty("implementation");
    expect(parsed).toHaveProperty("internalReferences");
  });

  it("handles the GroupController case from error log", () => {
    const input = `{
  "purpose": "This file defines a GroupController for the MifosX application",
  "implementation": "The implementation extends the mifosX.controllers module with a GroupController that manages scope variables for groups display including pagination settings, search functionality, and filtering capabilities."
  "internalReferences": [],
  "externalReferences": ["mifosX", "_"],
  "databaseIntegration": {
    "mechanism": "NONE",
    "description": "This controller does not contain direct database integration code.",
    "codeExample": "n/a"
  }
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain(
      '"implementation": "The implementation extends the mifosX.controllers module with a GroupController that manages scope variables for groups display including pagination settings, search functionality, and filtering capabilities.",',
    );
    // Verify the result is valid JSON
    expect(() => JSON.parse(result.content)).not.toThrow();
    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveProperty("purpose");
    expect(parsed).toHaveProperty("implementation");
    expect(parsed).toHaveProperty("internalReferences");
    expect(parsed).toHaveProperty("databaseIntegration");
  });

  it("handles multiple missing commas", () => {
    const input = `{
  "a": "value1"
  "b": "value2"
  "c": "value3"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('"a": "value1",');
    expect(result.content).toContain('"b": "value2",');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("does not add comma when property is last in object", () => {
    const input = `{
  "a": "value1",
  "b": "value2"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(false);
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("handles missing comma after nested object", () => {
    const input = `{
  "outer": {"inner": "value"}
  "next": "value"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('{"inner": "value"},');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("handles missing comma after array", () => {
    const input = `{
  "arr": ["a", "b"]
  "next": "value"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('["a", "b"],');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("does not add comma inside string values", () => {
    const input = '{"a":"value with \\" quote marks"}';
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(false);
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("handles complex nested case with missing comma", () => {
    const input = `{
  "outer": {
    "field1": "value1",
    "field2": "value2"
    "field3": "value3"
  }
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('"field2": "value2",');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("handles missing comma with multiline string values", () => {
    const input = `{
  "long": "This is a very long text value that the LLM generated"
  "next": "value"
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain(
      '"long": "This is a very long text value that the LLM generated",',
    );
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("does not incorrectly add comma in valid nested structures", () => {
    const input = `{
  "a": "value",
  "nested": {
    "b": "value"
  }
}`;
    const result = addMissingPropertyCommas(input);
    expect(result.changed).toBe(false);
    expect(() => JSON.parse(result.content)).not.toThrow();
  });
});
