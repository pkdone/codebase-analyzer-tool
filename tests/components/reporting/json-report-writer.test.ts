import "reflect-metadata";
import path from "path";
import {
  JsonReportWriter,
  PreparedJsonData,
} from "../../../src/components/reporting/json-report-writer";
import { outputConfig } from "../../../src/config/output.config";
import { writeFile } from "../../../src/common/utils/file-operations";

// Mock dependencies
jest.mock("../../../src/common/utils/file-operations");

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

describe("JsonReportWriter", () => {
  let jsonReportWriter: JsonReportWriter;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  const mockPreparedDataList: PreparedJsonData[] = [
    {
      filename: "entities.json",
      data: [
        { name: "User", type: "Entity", properties: ["id", "name", "email"] },
        { name: "Product", type: "Entity", properties: ["id", "title", "price"] },
      ],
    },
    {
      filename: "app-stats.json",
      data: { fileCount: 150, linesOfCode: 7500, lastUpdated: "2024-01-15" },
    },
    {
      filename: "file-types.json",
      data: { typescript: 80, javascript: 45, json: 25, markdown: 10 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    jsonReportWriter = new JsonReportWriter();

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleError = jest.spyOn(console, "error").mockImplementation();

    // Setup default mock implementation
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe("writeAllJSONFiles", () => {
    it("should write all JSON files successfully", async () => {
      await jsonReportWriter.writeAllJSONFiles(mockPreparedDataList);

      expect(mockWriteFile).toHaveBeenCalledTimes(3);

      // Verify each file was written with correct path and content
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "entities.json"),
        JSON.stringify(mockPreparedDataList[0].data, null, 2),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "app-stats.json"),
        JSON.stringify(mockPreparedDataList[1].data, null, 2),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "file-types.json"),
        JSON.stringify(mockPreparedDataList[2].data, null, 2),
      );

      // Verify console output
      expect(mockConsoleLog).toHaveBeenCalledWith("Generating JSON files for all data sections...");
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: entities.json");
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: app-stats.json");
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: file-types.json");
      expect(mockConsoleLog).toHaveBeenCalledWith("Finished generating all JSON files");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it("should handle empty data list", async () => {
      await jsonReportWriter.writeAllJSONFiles([]);

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("Generating JSON files for all data sections...");
      expect(mockConsoleLog).toHaveBeenCalledWith("Finished generating all JSON files");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it("should handle individual file write failures gracefully", async () => {
      const fileError = new Error("Failed to write file");
      mockWriteFile
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(fileError) // Second file fails
        .mockResolvedValueOnce(undefined); // Third file succeeds

      await jsonReportWriter.writeAllJSONFiles(mockPreparedDataList);

      expect(mockWriteFile).toHaveBeenCalledTimes(3);
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: entities.json");
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to write a JSON file:", fileError);
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: file-types.json");
      expect(mockConsoleLog).toHaveBeenCalledWith("Finished generating all JSON files");
    });

    it("should handle multiple file write failures", async () => {
      const error1 = new Error("First file error");
      const error2 = new Error("Second file error");

      mockWriteFile
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce(undefined);

      await jsonReportWriter.writeAllJSONFiles(mockPreparedDataList);

      expect(mockConsoleError).toHaveBeenCalledWith("Failed to write a JSON file:", error1);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to write a JSON file:", error2);
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: file-types.json");
    });

    it("should handle all files failing", async () => {
      const fileError = new Error("Write failed");
      mockWriteFile.mockRejectedValue(fileError);

      await jsonReportWriter.writeAllJSONFiles(mockPreparedDataList);

      expect(mockWriteFile).toHaveBeenCalledTimes(3);
      expect(mockConsoleError).toHaveBeenCalledTimes(3);
      expect(mockConsoleLog).toHaveBeenCalledWith("Generating JSON files for all data sections...");
      expect(mockConsoleLog).toHaveBeenCalledWith("Finished generating all JSON files");
      // Should not log any "Generated JSON file" messages
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringMatching(/^Generated JSON file:/),
      );
    });
  });

  describe("JSON formatting", () => {
    it("should format JSON with proper indentation", async () => {
      const complexData = [
        {
          filename: "complex.json",
          data: {
            nested: {
              object: {
                with: ["arrays", "and", "values"],
                numbers: 42,
                booleans: true,
                nullValue: null,
              },
            },
          },
        },
      ];

      await jsonReportWriter.writeAllJSONFiles(complexData);

      const expectedJson = JSON.stringify(complexData[0].data, null, 2);
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "complex.json"),
        expectedJson,
      );

      // Verify the JSON is properly formatted (has newlines and indentation)
      expect(expectedJson).toContain("\n");
      expect(expectedJson).toContain("  "); // 2-space indentation
    });

    it("should handle special data types in JSON", async () => {
      const specialData = [
        {
          filename: "special.json",
          data: {
            string: "text",
            number: 123,
            boolean: false,
            null: null,
            undefined: undefined, // Will be omitted in JSON
            array: [1, 2, 3],
            emptyArray: [],
            emptyObject: {},
            date: new Date("2024-01-15").toISOString(),
          },
        },
      ];

      await jsonReportWriter.writeAllJSONFiles(specialData);

      const actualCall = mockWriteFile.mock.calls[0];
      const writtenJson = actualCall[1];
      const parsedJson = JSON.parse(writtenJson);

      expect(parsedJson).toHaveProperty("string", "text");
      expect(parsedJson).toHaveProperty("number", 123);
      expect(parsedJson).toHaveProperty("boolean", false);
      expect(parsedJson).toHaveProperty("null", null);
      expect(parsedJson).not.toHaveProperty("undefined"); // Should be omitted
      expect(parsedJson.array).toEqual([1, 2, 3]);
      expect(parsedJson.emptyArray).toEqual([]);
      expect(parsedJson.emptyObject).toEqual({});
    });
  });

  describe("file paths", () => {
    it("should use correct output directory from config", async () => {
      const testData = [{ filename: "test.json", data: { test: true } }];

      await jsonReportWriter.writeAllJSONFiles(testData);

      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "test.json"),
        expect.any(String),
      );
    });

    it("should handle filenames with different extensions", async () => {
      const testData = [
        { filename: "data.json", data: {} },
        { filename: "config.json", data: {} },
        { filename: "report.json", data: {} },
      ];

      await jsonReportWriter.writeAllJSONFiles(testData);

      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "data.json"),
        expect.any(String),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "config.json"),
        expect.any(String),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "report.json"),
        expect.any(String),
      );
    });

    it("should handle special characters in filenames", async () => {
      const testData = [
        { filename: "file with spaces.json", data: {} },
        { filename: "file-with-dashes.json", data: {} },
        { filename: "file_with_underscores.json", data: {} },
      ];

      await jsonReportWriter.writeAllJSONFiles(testData);

      testData.forEach(({ filename }) => {
        expect(mockWriteFile).toHaveBeenCalledWith(
          path.join(outputConfig.OUTPUT_DIR, filename),
          expect.any(String),
        );
      });
    });
  });

  describe("edge cases", () => {
    it("should handle single file data", async () => {
      const singleFile = [{ filename: "single.json", data: { single: true } }];

      await jsonReportWriter.writeAllJSONFiles(singleFile);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith("Generated JSON file: single.json");
    });

    it("should handle large data objects", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
      const largeData = [{ filename: "large.json", data: { items: largeArray } }];

      await jsonReportWriter.writeAllJSONFiles(largeData);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = mockWriteFile.mock.calls[0][1];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent.items).toHaveLength(1000);
    });

    it("should handle null data gracefully", async () => {
      const nullData = [{ filename: "null.json", data: null }];

      await jsonReportWriter.writeAllJSONFiles(nullData);

      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(outputConfig.OUTPUT_DIR, "null.json"),
        "null",
      );
    });
  });
});
