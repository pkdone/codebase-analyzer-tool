import { describe, it, expect } from "@jest/globals";
import { databaseIntegrationSchema } from "../../src/schemas/sources.schema";

describe("databaseIntegrationSchema mechanism coercion", () => {
  it("accepts valid value unchanged", () => {
    const parsed = databaseIntegrationSchema.parse({
      mechanism: "JDBC",
      description: "desc",
      codeExample: "code",
    });
    expect(parsed.mechanism).toBe("JDBC");
  });

  it("coerces unknown value to OTHER", () => {
    const parsed = databaseIntegrationSchema.parse({
      mechanism: "Driver", // mixed case + unknown synonym
      description: "desc",
      codeExample: "code",
    });
    expect(parsed.mechanism).toBe("OTHER");
  });

  it("coerces completely invalid random string to OTHER", () => {
    const parsed = databaseIntegrationSchema.parse({
      mechanism: "totally-random-value",
      description: "desc",
      codeExample: "code",
    });
    expect(parsed.mechanism).toBe("OTHER");
  });
});
