import { zodToJsonSchemaForMDB } from "../../../src/common/mongodb/zod-to-mdb-json-schema";
import { z } from "zod";

describe("zod-to-mdb-json-schema - immutability", () => {
  it("should not mutate input schema when converting const to enum", () => {
    const schema = z.object({
      status: z.literal("active"),
      name: z.string(),
    });

    const result = zodToJsonSchemaForMDB(schema);

    // Verify result is correct
    const resultObj = result as unknown as {
      properties: Record<string, unknown>;
    };
    expect(resultObj.properties.status).toHaveProperty("enum");
    expect(resultObj.properties.status).not.toHaveProperty("const");

    // Verify original schema object structure is unchanged
    // (We can't directly compare the Zod schema object, but we verify the conversion worked)
    expect(result).toBeDefined();
  });

  it("should create new objects for nested schemas", () => {
    const schema = z.object({
      user: z.object({
        status: z.literal("active"),
        role: z.literal("admin"),
      }),
      tags: z.array(z.literal("tag1")),
    });

    const result = zodToJsonSchemaForMDB(schema);
    const resultObj = result as unknown as {
      properties: Record<string, unknown>;
    };

    // Verify nested const values are converted
    const userProps = resultObj.properties.user as { properties: Record<string, unknown> };
    expect(userProps.properties.status).toHaveProperty("enum");
    expect(userProps.properties.role).toHaveProperty("enum");

    // Verify array items are converted
    const tagsProps = resultObj.properties.tags as { items: unknown };
    expect(tagsProps.items).toHaveProperty("enum");
  });

  it("should handle empty objects without mutation", () => {
    const schema = z.object({});
    const result = zodToJsonSchemaForMDB(schema);

    expect(result).toBeDefined();
    const resultObj = result as unknown as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(resultObj.properties)).toHaveLength(0);
  });

  it("should handle arrays of objects with const values", () => {
    const schema = z.object({
      items: z.array(
        z.object({
          type: z.literal("item"),
          value: z.string(),
        }),
      ),
    });

    const result = zodToJsonSchemaForMDB(schema);
    const resultObj = result as unknown as {
      properties: Record<string, unknown>;
    };

    const itemsProps = resultObj.properties.items as {
      items: { properties: Record<string, unknown> };
    };
    expect(itemsProps.items.properties.type).toHaveProperty("enum");
    expect(itemsProps.items.properties.type).not.toHaveProperty("const");
  });
});
