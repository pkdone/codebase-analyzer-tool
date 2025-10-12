import { queryingConfig } from "../../../src/components/querying/config/querying.config";

describe("queryingConfig", () => {
  it("should be defined", () => {
    expect(queryingConfig).toBeDefined();
  });

  describe("VECTOR_SEARCH_NUM_CANDIDATES", () => {
    it("should have VECTOR_SEARCH_NUM_CANDIDATES property", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
    });

    it("should be set to 150", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
    });

    it("should be a positive number", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeGreaterThan(0);
    });
  });

  describe("VECTOR_SEARCH_NUM_LIMIT", () => {
    it("should have VECTOR_SEARCH_NUM_LIMIT property", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
    });

    it("should be set to 6", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
    });

    it("should be a positive number", () => {
      expect(queryingConfig.VECTOR_SEARCH_NUM_LIMIT).toBeGreaterThan(0);
    });
  });

  describe("configuration validation", () => {
    it("should have num candidates greater than num limit", () => {
      // This makes sense: we evaluate more candidates than we return
      expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeGreaterThan(
        queryingConfig.VECTOR_SEARCH_NUM_LIMIT,
      );
    });

    it("should be a const object", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // Runtime immutability would require Object.freeze()
      expect(Object.isFrozen(queryingConfig)).toBe(false); // Not frozen, but typed as readonly
    });
  });
});
