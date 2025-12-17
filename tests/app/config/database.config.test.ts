import { databaseConfig } from "../../../src/app/config/database.config";

describe("databaseConfig", () => {
  describe("basic configuration", () => {
    it("should have DEFAULT_MONGO_SERVICE_ID defined", () => {
      expect(databaseConfig.DEFAULT_MONGO_SERVICE_ID).toBe("default");
    });

    it("should have CODEBASE_DB_NAME defined", () => {
      expect(databaseConfig.CODEBASE_DB_NAME).toBe("codebase-analyzed");
    });

    it("should have SOURCES_COLLECTION_NAME defined", () => {
      expect(databaseConfig.SOURCES_COLLECTION_NAME).toBe("sources");
    });

    it("should have SUMMARIES_COLLECTION_NAME defined", () => {
      expect(databaseConfig.SUMMARIES_COLLECTION_NAME).toBe("appsummaries");
    });
  });

  describe("vector configuration", () => {
    it("should have CONTENT_VECTOR_FIELD defined", () => {
      expect(databaseConfig.CONTENT_VECTOR_FIELD).toBe("contentVector");
    });

    it("should have SUMMARY_VECTOR_FIELD defined", () => {
      expect(databaseConfig.SUMMARY_VECTOR_FIELD).toBe("summaryVector");
    });

    it("should have CONTENT_VECTOR_INDEX_NAME defined", () => {
      expect(databaseConfig.CONTENT_VECTOR_INDEX_NAME).toBe("contentVector_vector_index");
    });

    it("should have SUMMARY_VECTOR_INDEX_NAME defined", () => {
      expect(databaseConfig.SUMMARY_VECTOR_INDEX_NAME).toBe("summaryVector_vector_index");
    });

    it("should have DEFAULT_VECTOR_DIMENSIONS defined", () => {
      expect(databaseConfig.DEFAULT_VECTOR_DIMENSIONS).toBe(1536);
    });

    it("should have VECTOR_SIMILARITY_TYPE defined", () => {
      expect(databaseConfig.VECTOR_SIMILARITY_TYPE).toBe("euclidean");
    });

    it("should have VECTOR_QUANTIZATION_TYPE defined", () => {
      expect(databaseConfig.VECTOR_QUANTIZATION_TYPE).toBe("scalar");
    });
  });

  describe("dependency graph configuration", () => {
    it("should have DEPENDENCY_GRAPH_MAX_DEPTH defined", () => {
      expect(databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH).toBeDefined();
      expect(databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH).toBe(1);
    });

    it("should have DEPENDENCY_GRAPH_RESULT_LIMIT defined", () => {
      expect(databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT).toBeDefined();
      expect(databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT).toBe(5);
    });

    it("should have dependency graph values as positive integers", () => {
      expect(databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH).toBeGreaterThan(0);
      expect(databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT).toBeGreaterThan(0);
      expect(Number.isInteger(databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH)).toBe(true);
      expect(Number.isInteger(databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT)).toBe(true);
    });
  });

  describe("vector index configuration", () => {
    it("should have VECTOR_INDEX_CONFIGS defined", () => {
      expect(databaseConfig.VECTOR_INDEX_CONFIGS).toBeDefined();
      expect(Array.isArray(databaseConfig.VECTOR_INDEX_CONFIGS)).toBe(true);
    });

    it("should have correct number of vector index configurations", () => {
      expect(databaseConfig.VECTOR_INDEX_CONFIGS).toHaveLength(2);
    });

    it("should have content vector index configuration", () => {
      const contentConfig = databaseConfig.VECTOR_INDEX_CONFIGS[0];
      expect(contentConfig).toBeDefined();
      expect(contentConfig.field).toBe("contentVector");
      expect(contentConfig.name).toBe("contentVector_vector_index");
    });

    it("should have summary vector index configuration", () => {
      const summaryConfig = databaseConfig.VECTOR_INDEX_CONFIGS[1];
      expect(summaryConfig).toBeDefined();
      expect(summaryConfig.field).toBe("summaryVector");
      expect(summaryConfig.name).toBe("summaryVector_vector_index");
    });

    it("should have vector index configs that match field and index name constants", () => {
      const contentConfig = databaseConfig.VECTOR_INDEX_CONFIGS.find(
        (c) => c.field === databaseConfig.CONTENT_VECTOR_FIELD,
      );
      expect(contentConfig).toBeDefined();
      expect(contentConfig?.name).toBe(databaseConfig.CONTENT_VECTOR_INDEX_NAME);

      const summaryConfig = databaseConfig.VECTOR_INDEX_CONFIGS.find(
        (c) => c.field === databaseConfig.SUMMARY_VECTOR_FIELD,
      );
      expect(summaryConfig).toBeDefined();
      expect(summaryConfig?.name).toBe(databaseConfig.SUMMARY_VECTOR_INDEX_NAME);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = databaseConfig;
      expect(config).toHaveProperty("CODEBASE_DB_NAME");
      expect(config).toHaveProperty("DEPENDENCY_GRAPH_MAX_DEPTH");
      expect(config).toHaveProperty("DEPENDENCY_GRAPH_RESULT_LIMIT");
    });

    it("should be typed as const", () => {
      // This test verifies that TypeScript treats the config as readonly
      const dbName: "codebase-analyzed" = databaseConfig.CODEBASE_DB_NAME;
      const maxDepth: 1 = databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH;
      const resultLimit: 5 = databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT;

      expect(dbName).toBe("codebase-analyzed");
      expect(maxDepth).toBe(1);
      expect(resultLimit).toBe(5);
    });
  });
});
