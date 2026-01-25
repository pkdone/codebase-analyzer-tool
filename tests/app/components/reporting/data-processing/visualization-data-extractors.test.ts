import "reflect-metadata";
import {
  extractKeyBusinessActivities,
  extractMicroserviceFields,
} from "../../../../../src/app/components/reporting/data-processing";
import type { AppSummaryNameDescArray } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("visualization-data-extractors", () => {
  describe("extractKeyBusinessActivities", () => {
    it("should extract activities from valid business process data", () => {
      const item: AppSummaryNameDescArray[0] = {
        name: "Order Process",
        description: "Handles order flow",
        keyBusinessActivities: [
          { activity: "Validate Order", description: "Check order validity" },
          { activity: "Process Payment", description: "Handle payment" },
        ],
      };

      const result = extractKeyBusinessActivities(item);

      expect(result).toHaveLength(2);
      expect(result[0].activity).toBe("Validate Order");
      expect(result[1].activity).toBe("Process Payment");
    });

    it("should return empty array when keyBusinessActivities is missing", () => {
      const item: AppSummaryNameDescArray[0] = {
        name: "Simple Process",
        description: "No activities",
      };

      const result = extractKeyBusinessActivities(item);

      expect(result).toEqual([]);
    });

    it("should return empty array for invalid data structure", () => {
      // Using unknown type cast to test invalid data
      const item = { invalid: "structure" } as unknown as AppSummaryNameDescArray[0];

      const result = extractKeyBusinessActivities(item);

      expect(result).toEqual([]);
    });
  });

  describe("extractMicroserviceFields", () => {
    it("should extract all microservice fields from valid data", () => {
      const item: AppSummaryNameDescArray[0] = {
        name: "UserService",
        description: "User management",
        entities: [{ name: "User", description: "User entity", attributes: ["id", "email"] }],
        endpoints: [{ path: "/users", method: "GET", description: "List users" }],
        operations: [{ operation: "createUser", method: "POST", description: "Create user" }],
      };

      const result = extractMicroserviceFields(item);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].attributes).toEqual(["id", "email"]);
      expect(result.endpoints).toHaveLength(1);
      expect(result.operations).toHaveLength(1);
    });

    it("should return empty arrays for missing optional fields", () => {
      const item: AppSummaryNameDescArray[0] = {
        name: "MinimalService",
        description: "Minimal",
      };

      const result = extractMicroserviceFields(item);

      expect(result.entities).toEqual([]);
      expect(result.endpoints).toEqual([]);
      expect(result.operations).toEqual([]);
    });

    it("should normalize entities without attributes", () => {
      const item: AppSummaryNameDescArray[0] = {
        name: "TestService",
        description: "Test",
        entities: [{ name: "Entity", description: "Entity without attributes" }],
        endpoints: [],
        operations: [],
      };

      const result = extractMicroserviceFields(item);

      expect(result.entities[0].attributes).toEqual([]);
    });

    it("should return empty defaults for invalid data structure", () => {
      // Using unknown type cast to test invalid data
      const item = { invalid: "structure" } as unknown as AppSummaryNameDescArray[0];

      const result = extractMicroserviceFields(item);

      expect(result).toEqual({
        entities: [],
        endpoints: [],
        operations: [],
      });
    });
  });
});
