import "reflect-metadata";
import { MongoClient, MongoClientOptions, MongoError } from "mongodb";
import { MongoDBClientFactory } from "../../../src/common/mdb/mdb-client-factory";
import { logErrorMsgAndDetail } from "../../../src/common/utils/error-utils";
import { redactUrl } from "../../../src/common/mdb/mdb-utils";

// Mock dependencies
jest.mock("mongodb");
jest.mock("../../../src/common/utils/error-utils");
jest.mock("../../../src/common/mdb/mdb-utils");

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockLogErrorMsgAndDetail = logErrorMsgAndDetail as jest.MockedFunction<
  typeof logErrorMsgAndDetail
>;
const mockRedactUrl = redactUrl as jest.MockedFunction<typeof redactUrl>;

describe("MongoDBClientFactory", () => {
  let factory: MongoDBClientFactory;
  let mockClient: jest.Mocked<MongoClient>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;

  beforeEach(() => {
    factory = new MongoDBClientFactory();

    // Create a mock client with all necessary methods
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn(),
      topology: {},
    } as unknown as jest.Mocked<MongoClient>;

    MockedMongoClient.mockImplementation(() => mockClient);

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

    // Setup default mock implementations
    mockRedactUrl.mockImplementation((url: string) => `REDACTED_${url}`);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("connect", () => {
    test("successfully connects to MongoDB and returns client", async () => {
      const id = "test-connection";
      const url = "mongodb://localhost:27017/test";
      const options: MongoClientOptions = { maxPoolSize: 10 };

      const result = await factory.connect(id, url, options);

      expect(MockedMongoClient).toHaveBeenCalledWith(url, options);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockRedactUrl).toHaveBeenCalledWith(url);
      expect(mockConsoleLog).toHaveBeenCalledWith(`Connecting MongoDB client to: REDACTED_${url}`);
      expect(result).toBe(mockClient);
    });

    test("connects without options", async () => {
      const id = "test-connection";
      const url = "mongodb://localhost:27017/test";

      const result = await factory.connect(id, url);

      expect(MockedMongoClient).toHaveBeenCalledWith(url, undefined);
      expect(result).toBe(mockClient);
    });

    test("returns existing client if already connected", async () => {
      const id = "existing-connection";
      const url = "mongodb://localhost:27017/test";

      // First connection
      await factory.connect(id, url);

      // Second connection with same id
      const result = await factory.connect(id, url);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `MongoDB client with id '${id}' is already connected.`,
      );
      expect(MockedMongoClient).toHaveBeenCalledTimes(1); // Should only be called once
      expect(result).toBe(mockClient);
    });

    test("throws MongoError when connection fails", async () => {
      const id = "failed-connection";
      const url = "mongodb://localhost:27017/test";
      const connectionError = new Error("Connection failed");

      // Create a new mock client that will fail to connect
      const failingMockClient = {
        connect: jest.fn().mockRejectedValue(connectionError),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn(),
        topology: {},
      } as unknown as jest.Mocked<MongoClient>;

      // Mock the constructor to return the failing client
      MockedMongoClient.mockImplementationOnce(() => failingMockClient);

      try {
        await factory.connect(id, url);
        fail("Expected MongoError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MongoError);
        // The important part is that a MongoError is thrown when connection fails
      }

      expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
        "Failed to connect to MongoDB",
        connectionError,
      );
    });

    test("wraps client close method to remove from factory", async () => {
      const id = "test-connection";
      const url = "mongodb://localhost:27017/test";

      const client = await factory.connect(id, url);

      // Verify client is in factory
      expect(factory.getClient(id)).toBe(client);

      // Call close on the client
      await client.close();

      // Verify client is removed from factory
      expect(() => factory.getClient(id)).toThrow(
        new MongoError(
          `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
        ),
      );
    });

    test("wrapped close method calls original close with arguments", async () => {
      const id = "test-connection";
      const url = "mongodb://localhost:27017/test";
      const forceClose = true;

      // Create a spy on the original close method before connecting
      const originalCloseSpy = jest.spyOn(mockClient, "close");

      const client = await factory.connect(id, url);

      await client.close(forceClose);

      // The wrapped close should call the original mock
      expect(originalCloseSpy).toHaveBeenCalledWith(forceClose);
    });
  });

  describe("getClient", () => {
    test("returns existing client", async () => {
      const id = "test-connection";
      const url = "mongodb://localhost:27017/test";

      await factory.connect(id, url);
      const result = factory.getClient(id);

      expect(result).toBe(mockClient);
    });

    test("throws MongoError when client does not exist", () => {
      const id = "non-existent";

      expect(() => factory.getClient(id)).toThrow(
        new MongoError(
          `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
        ),
      );
    });
  });

  describe("closeAll", () => {
    test("closes all connected clients", async () => {
      const clients = [
        { id: "client1", url: "mongodb://localhost:27017/db1" },
        { id: "client2", url: "mongodb://localhost:27018/db2" },
        { id: "client3", url: "mongodb://localhost:27019/db3" },
      ];

      // Create an array to track close method spies
      const closeSpies: jest.SpyInstance[] = [];

      // Mock the MongoClient constructor to return different instances
      MockedMongoClient.mockImplementation(() => {
        const newMockClient = {
          connect: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
          db: jest.fn(),
          topology: {},
        } as unknown as jest.Mocked<MongoClient>;
        // Create a spy on each client's close method
        closeSpies.push(jest.spyOn(newMockClient, "close"));
        return newMockClient;
      });

      // Connect multiple clients
      for (const { id, url } of clients) {
        await factory.connect(id, url);
      }

      await factory.closeAll();

      // Each client should have been closed
      closeSpies.forEach((spy) => {
        expect(spy).toHaveBeenCalledTimes(1);
      });

      // Console should log closure of each client
      clients.forEach(({ id }) => {
        expect(mockConsoleLog).toHaveBeenCalledWith(`Closed MongoDB connection for id '${id}'.`);
      });

      // All clients should be removed from factory
      clients.forEach(({ id }) => {
        expect(() => factory.getClient(id)).toThrow(
          new MongoError(
            `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
          ),
        );
      });
    });

    test("handles errors when closing individual clients", async () => {
      const id = "error-client";
      const url = "mongodb://localhost:27017/test";
      const closeError = new Error("Close failed");

      const client = await factory.connect(id, url);

      // Mock close to throw an error by replacing the close method after connection
      client.close = jest.fn().mockRejectedValue(closeError);

      await factory.closeAll();

      expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
        `Error closing MongoDB client '${id}'`,
        closeError,
      );
    });

    test("clears all clients even when some fail to close", async () => {
      const clients = [
        { id: "client1", url: "mongodb://localhost:27017/db1" },
        { id: "client2", url: "mongodb://localhost:27018/db2" },
      ];

      // Mock the MongoClient constructor to return different instances
      MockedMongoClient.mockImplementation(() => {
        const newMockClient = {
          connect: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockRejectedValue(new Error("Close failed")),
          db: jest.fn(),
          topology: {},
        } as unknown as jest.Mocked<MongoClient>;
        return newMockClient;
      });

      // Connect multiple clients
      for (const { id, url } of clients) {
        await factory.connect(id, url);
      }

      await factory.closeAll();

      // All clients should still be removed from factory despite errors
      clients.forEach(({ id }) => {
        expect(() => factory.getClient(id)).toThrow(
          new MongoError(
            `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
          ),
        );
      });
    });

    test("handles empty client list", async () => {
      await factory.closeAll();

      // Should not attempt to close any clients
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    test("can connect, retrieve, and close multiple clients", async () => {
      const connections = [
        { id: "primary", url: "mongodb://localhost:27017/primary" },
        { id: "secondary", url: "mongodb://localhost:27018/secondary" },
      ];

      // Mock the MongoClient constructor to return different instances
      MockedMongoClient.mockImplementation(() => {
        const newMockClient = {
          connect: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
          db: jest.fn(),
          topology: {},
        } as unknown as jest.Mocked<MongoClient>;
        return newMockClient;
      });

      // Connect to multiple databases
      const clients = [];
      for (const { id, url } of connections) {
        const client = await factory.connect(id, url);
        clients.push(client);
      }

      // Retrieve clients
      const primaryClient = factory.getClient("primary");
      const secondaryClient = factory.getClient("secondary");

      expect(primaryClient).toBe(clients[0]);
      expect(secondaryClient).toBe(clients[1]);

      // Close all
      await factory.closeAll();

      // Verify all clients are removed
      connections.forEach(({ id }) => {
        expect(() => factory.getClient(id)).toThrow(MongoError);
      });
    });

    test("handles mixed success and failure scenarios", async () => {
      const goodUrl = "mongodb://localhost:27017/good";
      const badUrl = "mongodb://bad-host:27018/bad";

      // Successful connection
      await factory.connect("good", goodUrl);
      expect(factory.getClient("good")).toBe(mockClient);

      // Reset the mock call count
      jest.clearAllMocks();

      // Create a new mock client that will fail to connect
      const failingMockClient = {
        connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn(),
        topology: {},
      } as unknown as jest.Mocked<MongoClient>;

      // Mock the constructor to return the failing client for the next call
      MockedMongoClient.mockImplementationOnce(() => failingMockClient);

      try {
        await factory.connect("bad", badUrl);
        fail("Expected MongoError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MongoError);
      }
      expect(() => factory.getClient("bad")).toThrow(MongoError);

      // Good connection should still work
      expect(factory.getClient("good")).toBe(mockClient);
    });
  });
});
