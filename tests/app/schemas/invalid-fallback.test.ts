import {
  databaseIntegrationSchema,
  integrationEndpointSchema,
  DATABASE_MECHANISM_VALUES,
  OPERATION_TYPE_VALUES,
  INTEGRATION_MECHANISM_VALUES,
} from "../../../src/app/schemas/source-file.schema";

// Helper: pick a known valid value and an invalid one
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const pickValid = <T extends readonly string[]>(arr: T): string => arr[0];

describe("Normalization fallback behavior (DATABASE -> INVALID, others -> INVALID)", () => {
  test("databaseIntegrationSchema mechanism preserves valid (case-insensitive) and invalid -> INVALID", () => {
    const valid = pickValid(DATABASE_MECHANISM_VALUES);
    const parsed = databaseIntegrationSchema.parse({
      mechanism: valid.toLowerCase(), // lower-case variant
      description: "Test",
      codeExample: "n/a",
    });
    expect(parsed.mechanism).toBe(valid.toUpperCase());

    const invalidParsed = databaseIntegrationSchema.parse({
      mechanism: "not-a-real-mechanism",
      description: "Test",
      codeExample: "n/a",
    });
    expect(invalidParsed.mechanism).toBe("INVALID");
  });

  test("databaseIntegrationSchema operationType array normalizes each entry and invalid -> INVALID", () => {
    const valid = pickValid(OPERATION_TYPE_VALUES);
    const parsed = databaseIntegrationSchema.parse({
      mechanism: pickValid(DATABASE_MECHANISM_VALUES),
      operationType: [valid.toLowerCase(), "bogus"],
      description: "Test",
      codeExample: "n/a",
    });
    expect(parsed.operationType).toEqual([valid.toUpperCase(), "INVALID"]);
  });

  test("integrationEndpointSchema mechanism preserves valid and invalid -> INVALID", () => {
    const valid = pickValid(INTEGRATION_MECHANISM_VALUES);
    const parsed = integrationEndpointSchema.parse({
      mechanism: valid.toLowerCase(),
      name: "Endpoint",
      description: "Test",
    });
    expect(parsed.mechanism).toBe(valid.toUpperCase());

    const invalidParsed = integrationEndpointSchema.parse({
      mechanism: "unknown-proto",
      name: "Endpoint",
      description: "Test",
    });
    expect(invalidParsed.mechanism).toBe("INVALID");
  });
});
