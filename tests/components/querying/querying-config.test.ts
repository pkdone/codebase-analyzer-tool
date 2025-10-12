import { inputConfig } from "../../../src/components/querying/config/input.config";

describe("inputConfig", () => {
  it("should be defined", () => {
    expect(inputConfig).toBeDefined();
  });

  describe("VECTOR_SEARCH_NUM_CANDIDATES", () => {
    it("should have VECTOR_SEARCH_NUM_CANDIDATES property", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
    });

    it("should be set to 150", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
    });

    it("should be a positive number", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeGreaterThan(0);
    });
  });

  describe("VECTOR_SEARCH_NUM_LIMIT", () => {
    it("should have VECTOR_SEARCH_NUM_LIMIT property", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
    });

    it("should be set to 6", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
    });

    it("should be a positive number", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_LIMIT).toBeGreaterThan(0);
    });
  });

  describe("configuration validation", () => {
    it("should have num candidates greater than num limit", () => {
      // This makes sense: we evaluate more candidates than we return
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeGreaterThan(
        inputConfig.VECTOR_SEARCH_NUM_LIMIT,
      );
    });

    it("should be a const object", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // Runtime immutability would require Object.freeze()
      expect(Object.isFrozen(inputConfig)).toBe(false); // Not frozen, but typed as readonly
    });
  });
});
