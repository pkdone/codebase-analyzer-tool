/**
 * Test to verify database config moved correctly to src/app/config/
 */
import {
  databaseConfig,
  COLLECTION_TYPES,
  STANDARD_INDEX_CONFIGS,
} from "../../../src/app/config/database.config";

describe("database.config (new location)", () => {
  describe("databaseConfig", () => {
    it("should export databaseConfig with expected structure", () => {
      expect(databaseConfig).toBeDefined();
      expect(databaseConfig.CODEBASE_DB_NAME).toBeDefined();
      expect(databaseConfig.SOURCES_COLLECTION_NAME).toBeDefined();
      expect(databaseConfig.SUMMARIES_COLLECTION_NAME).toBeDefined();
    });

    it("should have correct collection names", () => {
      expect(databaseConfig.SOURCES_COLLECTION_NAME).toBe("sources");
      expect(databaseConfig.SUMMARIES_COLLECTION_NAME).toBe("appsummaries");
    });

    it("should have vector configuration", () => {
      expect(databaseConfig.DEFAULT_VECTOR_DIMENSIONS).toBe(1536);
      expect(databaseConfig.VECTOR_SIMILARITY_TYPE).toBe("euclidean");
      expect(databaseConfig.VECTOR_INDEX_CONFIGS).toHaveLength(2);
    });
  });

  describe("COLLECTION_TYPES", () => {
    it("should export collection type constants", () => {
      expect(COLLECTION_TYPES.SOURCES).toBe("sources");
      expect(COLLECTION_TYPES.SUMMARIES).toBe("summaries");
    });
  });

  describe("STANDARD_INDEX_CONFIGS", () => {
    it("should export standard index configurations", () => {
      expect(STANDARD_INDEX_CONFIGS).toBeDefined();
      expect(Array.isArray(STANDARD_INDEX_CONFIGS)).toBe(true);
      expect(STANDARD_INDEX_CONFIGS.length).toBeGreaterThan(0);
    });

    it("should have valid collection types in all configs", () => {
      const validTypes = new Set([COLLECTION_TYPES.SOURCES, COLLECTION_TYPES.SUMMARIES]);
      STANDARD_INDEX_CONFIGS.forEach((config) => {
        expect(validTypes.has(config.collection)).toBe(true);
      });
    });
  });
});
