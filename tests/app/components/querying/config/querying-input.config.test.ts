import { queryingInputConfig } from "../../../../../src/app/components/querying/querying-input.config";

describe("queryingInputConfig", () => {
  describe("vector search configuration", () => {
    it("should have VECTOR_SEARCH_NUM_CANDIDATES defined", () => {
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
    });

    it("should have VECTOR_SEARCH_NUM_LIMIT defined", () => {
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = queryingInputConfig;
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_CANDIDATES");
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_LIMIT");
    });
  });
});
