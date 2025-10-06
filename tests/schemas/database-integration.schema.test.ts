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

  it("normalizes DRIVER mechanism in any case", () => {
    const parsed = databaseIntegrationSchema.parse({
      mechanism: "Driver", // mixed case now valid and should normalize
      description: "desc",
      codeExample: "code",
    });
    expect(parsed.mechanism).toBe("DRIVER");

    const parsedLower = databaseIntegrationSchema.parse({
      mechanism: "driver",
      description: "desc",
      codeExample: "code",
    });
    expect(parsedLower.mechanism).toBe("DRIVER");
  });

  it("coerces completely invalid random string to OTHER", () => {
    const parsed = databaseIntegrationSchema.parse({
      mechanism: "totally-random-value",
      description: "desc",
      codeExample: "code",
    });
    expect(parsed.mechanism).toBe("OTHER");
  });

  it("accepts new ecosystem specific mechanisms", () => {
    const mechanisms = [
      "EF-CORE",
      "ADO-NET",
      "DAPPER",
      "ACTIVE-RECORD",
      "SEQUEL",
      "MONGOOSE",
      "PRISMA",
      "MICRO-ORM",
    ];
    mechanisms.forEach((m) => {
      const parsed = databaseIntegrationSchema.parse({
        mechanism: m.toLowerCase(), // provide lowercase to test normalization
        description: "desc",
        codeExample: "code",
      });
      expect(parsed.mechanism).toBe(m); // should normalize to uppercase constant
    });
  });
});
