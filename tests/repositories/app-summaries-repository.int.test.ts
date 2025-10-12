import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "../../src/tokens";
import { AppSummariesRepository } from "../../src/repositories/app-summary/app-summaries.repository.interface";
import { MongoClient } from "mongodb";
import {
  AppSummaryRecord,
  PartialAppSummaryRecord,
} from "../../src/repositories/app-summary/app-summaries.model";
import { setupTestDatabase, teardownTestDatabase } from "../helpers/db-test-helper";

describe("AppSummariesRepository Integration Tests", () => {
  let appSummariesRepository: AppSummariesRepository;
  let mongoClient: MongoClient;
  const testProjectName = `test-project-${Date.now()}`;

  beforeAll(async () => {
    // Setup the temporary database and get the client
    mongoClient = await setupTestDatabase();
    // Resolve the repository, which is now configured to use the test DB
    appSummariesRepository = container.resolve<AppSummariesRepository>(
      TOKENS.AppSummariesRepository,
    );
  }, 60000);

  afterAll(async () => {
    // Teardown the temporary database
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // The database is automatically cleared by the teardown/setup process.
    // We can insert fresh data here if needed for each test.
  });

  describe("Create and Replace Operations", () => {
    it("should create new app summary record with upsert", async () => {
      // Arrange
      const testRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Test application for integration testing",
        llmProvider: "openai",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "Node.js", description: "JavaScript runtime for server-side development" },
          { name: "MongoDB", description: "NoSQL document database" },
        ],
        entities: [
          { name: "User", description: "User management entity" },
          { name: "Product", description: "Product catalog entity" },
        ],
        businessProcesses: [
          {
            name: "User Registration",
            description: "Process for registering new users",
            keyBusinessActivities: [
              { activity: "Validation", description: "Validate user input data" },
              { activity: "Account Creation", description: "Create new user account" },
              { activity: "Email Verification", description: "Send and verify email confirmation" },
            ],
          },
        ],
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles user operations",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/api/users", method: "GET", description: "Get users" }],
            operations: [
              { operation: "Create User", method: "POST", description: "Create new user" },
            ],
          },
          {
            name: "ProductService",
            description: "Manages product catalog",
            entities: [{ name: "Product", description: "Product entity" }],
            endpoints: [{ path: "/api/products", method: "GET", description: "Get products" }],
            operations: [
              { operation: "Create Product", method: "POST", description: "Create new product" },
            ],
          },
        ],
      };

      // Act
      await appSummariesRepository.createOrReplaceAppSummary(testRecord);

      // Assert: Verify the record was inserted
      const retrieved = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.appDescription).toBe("Test application for integration testing");
      expect(retrieved!.llmProvider).toBe("openai");
    }, 30000);

    it("should replace existing app summary record with upsert", async () => {
      // Arrange: Create initial record
      const initialRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Initial description",
        llmProvider: "claude",
        technologies: [{ name: "JavaScript", description: "Dynamic programming language" }],
      };

      await appSummariesRepository.createOrReplaceAppSummary(initialRecord);

      // Verify initial record exists
      let retrieved = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);
      expect(retrieved!.appDescription).toBe("Initial description");
      expect(retrieved!.llmProvider).toBe("claude");

      // Act: Replace with new record
      const replacementRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Updated description",
        llmProvider: "openai",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "React", description: "JavaScript library for building user interfaces" },
        ],
        entities: [{ name: "User", description: "User entity" }],
      };

      await appSummariesRepository.createOrReplaceAppSummary(replacementRecord);

      // Assert: Verify the record was replaced completely
      retrieved = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);
      expect(retrieved!.appDescription).toBe("Updated description");
      expect(retrieved!.llmProvider).toBe("openai");

      // Check that the full record was replaced by getting technologies
      const technologiesField = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "technologies",
      );
      expect(technologiesField).toHaveLength(2);
      expect(technologiesField![0].name).toBe("TypeScript");
    }, 30000);
  });

  describe("Update Operations", () => {
    it("should update specific fields using $set", async () => {
      // Arrange: Create initial record
      const initialRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Initial description",
        llmProvider: "claude",
        technologies: [{ name: "JavaScript", description: "Dynamic language" }],
        entities: [{ name: "User", description: "User management" }],
      };

      await appSummariesRepository.createOrReplaceAppSummary(initialRecord);

      // Act: Update specific fields
      const updates: PartialAppSummaryRecord = {
        appDescription: "Updated description via partial update",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "Express", description: "Web framework for Node.js" },
        ],
      };

      await appSummariesRepository.updateAppSummary(testProjectName, updates);

      // Assert: Verify updated fields
      const retrieved = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);
      expect(retrieved!.appDescription).toBe("Updated description via partial update");
      expect(retrieved!.llmProvider).toBe("claude"); // Should remain unchanged

      const technologiesField = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "technologies",
      );
      expect(technologiesField).toHaveLength(2);
      expect(technologiesField![0].name).toBe("TypeScript");

      const entitiesField = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "entities",
      );
      expect(entitiesField).toHaveLength(1); // Should remain unchanged
      expect(entitiesField![0].name).toBe("User");
    }, 30000);

    it("should handle empty updates object", async () => {
      // Arrange: Create initial record
      const initialRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Initial description",
        llmProvider: "openai",
      };

      await appSummariesRepository.createOrReplaceAppSummary(initialRecord);

      // Act: Update with empty object
      await appSummariesRepository.updateAppSummary(testProjectName, {});

      // Assert: Record should remain unchanged
      const retrieved = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);
      expect(retrieved!.appDescription).toBe("Initial description");
      expect(retrieved!.llmProvider).toBe("openai");
    }, 30000);
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      // Set up a comprehensive test record for query operations
      const testRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Comprehensive test application",
        llmProvider: "openai",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "Node.js", description: "JavaScript runtime" },
          { name: "MongoDB", description: "NoSQL database" },
        ],
        entities: [
          { name: "User", description: "User management entity" },
          { name: "Product", description: "Product catalog entity" },
        ],
        businessProcesses: [
          {
            name: "Order Processing",
            description: "Process for handling customer orders",
            keyBusinessActivities: [
              {
                activity: "Order Validation",
                description: "Validate order data and business rules",
              },
              {
                activity: "Payment Processing",
                description: "Process payment through payment gateway",
              },
              { activity: "Fulfillment", description: "Arrange order fulfillment and shipping" },
            ],
          },
        ],
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles user operations",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/api/users", method: "GET", description: "Get users" }],
            operations: [
              { operation: "Create User", method: "POST", description: "Create new user" },
            ],
          },
          {
            name: "OrderService",
            description: "Manages order processing",
            entities: [{ name: "Order", description: "Order entity" }],
            endpoints: [{ path: "/api/orders", method: "GET", description: "Get orders" }],
            operations: [
              { operation: "Create Order", method: "POST", description: "Create new order" },
            ],
          },
        ],
        repositories: [
          { name: "UserRepository", description: "Data access for users", aggregate: "User" },
          { name: "OrderRepository", description: "Data access for orders", aggregate: "Order" },
        ],
      };

      await appSummariesRepository.createOrReplaceAppSummary(testRecord);
    });

    it("should return correct projected fields using generic getProjectAppSummaryFields", async () => {
      // Act
      const result = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
        "llmProvider",
      ]);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.appDescription).toBe("Comprehensive test application");
      expect(result!.llmProvider).toBe("openai");

      // Should only contain the projected fields
      expect(Object.keys(result!)).toEqual(["appDescription", "llmProvider"]);
    }, 30000);

    it("should return null for non-existent project", async () => {
      // Act
      const result = await appSummariesRepository.getProjectAppSummaryFields(
        "nonexistent-project",
        ["appDescription", "llmProvider"],
      );

      // Assert
      expect(result).toBeNull();
    }, 30000);

    it("should return specific field value from getProjectAppSummaryField", async () => {
      // Act & Assert: Test different field types
      const appDescription = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "appDescription",
      );
      expect(appDescription).toBe("Comprehensive test application");

      const llmProvider = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "llmProvider",
      );
      expect(llmProvider).toBe("openai");

      const technologies = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "technologies",
      );
      expect(technologies).toHaveLength(3);
      expect(technologies![0].name).toBe("TypeScript");

      const entities = await appSummariesRepository.getProjectAppSummaryField(
        testProjectName,
        "entities",
      );
      expect(entities).toHaveLength(2);
      expect(entities![0].name).toBe("User");
    }, 30000);

    it("should return null for non-existent field", async () => {
      // Act
      const result = await appSummariesRepository.getProjectAppSummaryField(
        "nonexistent-project",
        "appDescription",
      );

      // Assert
      expect(result).toBeNull();
    }, 30000);

    it("should return multiple fields from getProjectAppSummaryFields", async () => {
      // Act
      const fields = [
        "appDescription",
        "llmProvider",
        "technologies",
        "entities",
      ] as (keyof AppSummaryRecord)[];
      const result = await appSummariesRepository.getProjectAppSummaryFields(
        testProjectName,
        fields,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.appDescription).toBe("Comprehensive test application");
      expect(result!.llmProvider).toBe("openai");
      expect(result!.technologies).toHaveLength(3);
      expect(result!.entities).toHaveLength(2);

      // Should only contain the requested fields
      expect(Object.keys(result!)).toEqual([
        "appDescription",
        "llmProvider",
        "technologies",
        "entities",
      ]);
    }, 30000);

    it("should return null for empty field names array", async () => {
      // Act
      const result = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, []);

      // Assert
      expect(result).toBeNull();
    }, 30000);

    it("should return null for non-existent project in getProjectAppSummaryFields", async () => {
      // Act
      const result = await appSummariesRepository.getProjectAppSummaryFields(
        "nonexistent-project",
        ["appDescription"],
      );

      // Assert
      expect(result).toBeNull();
    }, 30000);

    it("should handle partial records where some requested fields are missing", async () => {
      // Arrange: Create record with only some fields
      const partialRecord: AppSummaryRecord = {
        projectName: `partial-${testProjectName}`,
        appDescription: "Partial record",
        llmProvider: "claude",
        // Missing technologies, entities, etc.
      };

      await appSummariesRepository.createOrReplaceAppSummary(partialRecord);

      // Act: Request fields including some that don't exist
      const fields = [
        "appDescription",
        "llmProvider",
        "technologies",
        "entities",
      ] as (keyof AppSummaryRecord)[];
      const result = await appSummariesRepository.getProjectAppSummaryFields(
        `partial-${testProjectName}`,
        fields,
      );

      // Assert: Should return only the fields that exist
      expect(result).not.toBeNull();
      expect(result!.appDescription).toBe("Partial record");
      expect(result!.llmProvider).toBe("claude");
      expect(result!.technologies).toBeUndefined();
      expect(result!.entities).toBeUndefined();

      // Clean up
      await mongoClient
        .db()
        .collection("app_summaries")
        .deleteMany({ projectName: `partial-${testProjectName}` });
    }, 30000);
  });

  describe("Projection Building", () => {
    beforeEach(async () => {
      const testRecord: AppSummaryRecord = {
        projectName: testProjectName,
        appDescription: "Test for projection building",
        llmProvider: "openai",
        technologies: [{ name: "TypeScript", description: "Static typing" }],
        entities: [{ name: "User", description: "User entity" }],
        businessProcesses: [
          {
            name: "TestProcess",
            description: "Test process",
            keyBusinessActivities: [{ activity: "Activity1", description: "First test activity" }],
          },
        ],
      };

      await appSummariesRepository.createOrReplaceAppSummary(testRecord);
    });

    it("should build correct projection for multiple fields", async () => {
      // Act: Request multiple different field types
      const fields = [
        "appDescription",
        "technologies",
        "entities",
        "businessProcesses",
      ] as (keyof AppSummaryRecord)[];
      const result = await appSummariesRepository.getProjectAppSummaryFields(
        testProjectName,
        fields,
      );

      // Assert: Should return all requested fields
      expect(result).not.toBeNull();
      expect(result!.appDescription).toBeDefined();
      expect(result!.technologies).toBeDefined();
      expect(result!.entities).toBeDefined();
      expect(result!.businessProcesses).toBeDefined();

      // Should not include llmProvider (not requested)
      expect(result!.llmProvider).toBeUndefined();

      // Should not include _id (always excluded)
      expect((result as any)._id).toBeUndefined();
    }, 30000);

    it("should always exclude _id field in projections", async () => {
      // Act: Request single field
      const result = await appSummariesRepository.getProjectAppSummaryFields(testProjectName, [
        "appDescription",
      ]);

      // Assert: Should not include _id
      expect(result).not.toBeNull();
      expect(result!.appDescription).toBeDefined();
      expect((result as any)._id).toBeUndefined();

      // Should only contain the requested field
      expect(Object.keys(result!)).toEqual(["appDescription"]);
    }, 30000);
  });

  describe("Schema Validation", () => {
    it("should return a valid collection validation schema", async () => {
      // Act
      const schema = appSummariesRepository.getCollectionValidationSchema();

      // Assert
      expect(schema).toBeDefined();
      expect(typeof schema).toBe("object");
      expect(schema).not.toBeNull();
    }, 30000);
  });
});
