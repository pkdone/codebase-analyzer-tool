import { Double } from "bson";
import {
  convertArrayOfNumbersToArrayOfDoubles,
  redactUrl,
  createVectorSearchIndexDefinition,
  REDACTED_URL,
  REDACTED_CREDENTIALS,
} from "../../../src/common/mdb/mdb-utils";
import { logErrorMsgAndDetail } from "../../../src/common/utils/error-utils";

// Mock the error-utils module
jest.mock("../../../src/common/utils/error-utils");
const mockLogErrorMsgAndDetail = logErrorMsgAndDetail as jest.MockedFunction<
  typeof logErrorMsgAndDetail
>;

describe("mdb-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("convertArrayOfNumbersToArrayOfDoubles", () => {
    test("converts array of numbers to BSON Doubles", () => {
      const numbers = [1, 2.5, 3.14, 0, -5.7];
      const result = convertArrayOfNumbersToArrayOfDoubles(numbers);

      expect(result).toHaveLength(numbers.length);
      result.forEach((double, index) => {
        expect(double).toBeInstanceOf(Double);
        expect(double.valueOf()).toBe(numbers[index]);
      });
    });

    test("handles empty array", () => {
      const result = convertArrayOfNumbersToArrayOfDoubles([]);
      expect(result).toEqual([]);
    });

    test("handles single number", () => {
      const result = convertArrayOfNumbersToArrayOfDoubles([42]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Double);
      expect(result[0].valueOf()).toBe(42);
    });

    test("handles negative numbers", () => {
      const numbers = [-1, -3.14, -100];
      const result = convertArrayOfNumbersToArrayOfDoubles(numbers);

      result.forEach((double, index) => {
        expect(double).toBeInstanceOf(Double);
        expect(double.valueOf()).toBe(numbers[index]);
      });
    });

    test("handles very large numbers", () => {
      const numbers = [Number.MAX_SAFE_INTEGER, 1e15];
      const result = convertArrayOfNumbersToArrayOfDoubles(numbers);

      result.forEach((double, index) => {
        expect(double).toBeInstanceOf(Double);
        expect(double.valueOf()).toBe(numbers[index]);
      });
    });
  });

  describe("redactUrl", () => {
    test("redacts username and password from MongoDB URL", () => {
      const url = "mongodb://username:password@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe(
        `mongodb://${REDACTED_CREDENTIALS}:${REDACTED_CREDENTIALS}@localhost:27017/mydb`,
      );
    });

    test("redacts only username when no password", () => {
      const url = "mongodb://username@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe(
        `mongodb://${REDACTED_CREDENTIALS}:${REDACTED_CREDENTIALS}@localhost:27017/mydb`,
      );
    });

    test("handles URL without credentials", () => {
      const url = "mongodb://localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe("mongodb://localhost:27017/mydb");
    });

    test("handles MongoDB Atlas URL with credentials", () => {
      const url =
        "mongodb+srv://user:pass@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority";
      const result = redactUrl(url);

      expect(result).toBe(
        `mongodb+srv://${REDACTED_CREDENTIALS}:${REDACTED_CREDENTIALS}@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority`,
      );
    });

    test("handles complex credentials with special characters", () => {
      const url = "mongodb://user%40domain:p%40ssw0rd@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe(
        `mongodb://${REDACTED_CREDENTIALS}:${REDACTED_CREDENTIALS}@localhost:27017/mydb`,
      );
    });

    test("returns REDACTED_URL when URL parsing fails", () => {
      const invalidUrl = "not-a-valid-url";
      const result = redactUrl(invalidUrl);

      expect(result).toBe(REDACTED_URL);
      expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
        "Could not parse URL for redaction",
        expect.anything(),
      );
    });

    test("handles empty string", () => {
      const result = redactUrl("");

      expect(result).toBe(REDACTED_URL);
      expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
        "Could not parse URL for redaction",
        expect.anything(),
      );
    });
  });

  describe("createVectorSearchIndexDefinition", () => {
    test("creates basic vector search index definition with defaults", () => {
      const result = createVectorSearchIndexDefinition("testIndex", "embedding");

      expect(result).toEqual({
        name: "testIndex",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 1536,
              similarity: "euclidean",
              quantization: "scalar",
            },
          ],
        },
      });
    });

    test("creates vector search index definition with custom parameters", () => {
      const result = createVectorSearchIndexDefinition(
        "customIndex",
        "vectorField",
        768,
        "cosine",
        "int8",
      );

      expect(result).toEqual({
        name: "customIndex",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "vectorField",
              numDimensions: 768,
              similarity: "cosine",
              quantization: "int8",
            },
          ],
        },
      });
    });

    test("creates vector search index definition with filters", () => {
      const filters = [
        { type: "filter", path: "category" },
        { type: "filter", path: "status" },
      ];

      const result = createVectorSearchIndexDefinition(
        "filteredIndex",
        "embedding",
        1536,
        "euclidean",
        "scalar",
        filters,
      );

      expect(result).toEqual({
        name: "filteredIndex",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 1536,
              similarity: "euclidean",
              quantization: "scalar",
            },
            {
              type: "filter",
              path: "category",
            },
            {
              type: "filter",
              path: "status",
            },
          ],
        },
      });
    });

    test("handles empty filters array", () => {
      const result = createVectorSearchIndexDefinition(
        "noFilterIndex",
        "embedding",
        1536,
        "euclidean",
        "scalar",
        [],
      );

      expect(result.definition.fields).toHaveLength(1);
      expect(result.definition.fields[0].type).toBe("vector");
    });

    test("creates index with different similarity metrics", () => {
      const similarities = ["cosine", "euclidean", "dotProduct"];

      similarities.forEach((similarity) => {
        const result = createVectorSearchIndexDefinition(
          `${similarity}Index`,
          "embedding",
          1536,
          similarity,
        );

        const vectorField = result.definition.fields[0] as {
          type: string;
          path: string;
          numDimensions: number;
          similarity: string;
          quantization: string;
        };
        expect(vectorField.similarity).toBe(similarity);
      });
    });

    test("creates index with different quantization types", () => {
      const quantizations = ["scalar", "int8", "binary"];

      quantizations.forEach((quantization) => {
        const result = createVectorSearchIndexDefinition(
          `${quantization}Index`,
          "embedding",
          1536,
          "euclidean",
          quantization,
        );

        const vectorField = result.definition.fields[0] as {
          type: string;
          path: string;
          numDimensions: number;
          similarity: string;
          quantization: string;
        };
        expect(vectorField.quantization).toBe(quantization);
      });
    });
  });
});
