import { databaseConfig } from "../../src/config/database.config";

describe("databaseConfig - dynamic VECTOR_INDEX_CONFIGS", () => {
  it("should generate VECTOR_INDEX_CONFIGS from field and index name constants", () => {
    expect(databaseConfig.VECTOR_INDEX_CONFIGS).toHaveLength(2);

    const contentConfig = databaseConfig.VECTOR_INDEX_CONFIGS[0];
    expect(contentConfig.field).toBe(databaseConfig.CONTENT_VECTOR_FIELD);
    expect(contentConfig.name).toBe(databaseConfig.CONTENT_VECTOR_INDEX_NAME);

    const summaryConfig = databaseConfig.VECTOR_INDEX_CONFIGS[1];
    expect(summaryConfig.field).toBe(databaseConfig.SUMMARY_VECTOR_FIELD);
    expect(summaryConfig.name).toBe(databaseConfig.SUMMARY_VECTOR_INDEX_NAME);
  });

  it("should maintain single source of truth for field names", () => {
    // Verify that changing the constant would change the config
    // This test documents the DRY principle
    expect(databaseConfig.VECTOR_INDEX_CONFIGS[0].field).toBe("contentVector");
    expect(databaseConfig.VECTOR_INDEX_CONFIGS[0].field).toBe(databaseConfig.CONTENT_VECTOR_FIELD);
  });

  it("should maintain single source of truth for index names", () => {
    // Verify that changing the constant would change the config
    expect(databaseConfig.VECTOR_INDEX_CONFIGS[0].name).toBe("contentVector_vector_index");
    expect(databaseConfig.VECTOR_INDEX_CONFIGS[0].name).toBe(
      databaseConfig.CONTENT_VECTOR_INDEX_NAME,
    );
  });

  it("should have consistent field-to-index-name mapping", () => {
    const contentConfig = databaseConfig.VECTOR_INDEX_CONFIGS.find(
      (c) => c.field === databaseConfig.CONTENT_VECTOR_FIELD,
    );
    expect(contentConfig?.name).toBe(databaseConfig.CONTENT_VECTOR_INDEX_NAME);

    const summaryConfig = databaseConfig.VECTOR_INDEX_CONFIGS.find(
      (c) => c.field === databaseConfig.SUMMARY_VECTOR_FIELD,
    );
    expect(summaryConfig?.name).toBe(databaseConfig.SUMMARY_VECTOR_INDEX_NAME);
  });
});
