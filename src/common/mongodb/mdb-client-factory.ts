import { MongoClient, MongoClientOptions } from "mongodb";
import { injectable } from "tsyringe";
import { logError, logSingleLineWarning } from "../utils/logging";
import { redactUrl } from "../security/url-redactor";
import { DatabaseConnectionError } from "./mdb-errors";

/**
 * A factory class for creating and managing MongoDB client connections.
 * This replaces the singleton pattern with dependency injection.
 */
@injectable()
export class MongoDBClientFactory {
  private readonly clients = new Map<string, MongoClient>();

  /**
   * Connects to a MongoDB instance using the given id and URL.
   *
   * @param id The id identifying the connection.
   * @param url The MongoDB connection string.
   * @param options Optional MongoDB client options.
   * @returns A Promise resolving to the connected MongoClient instance.
   */
  async connect(id: string, url: string, options?: MongoClientOptions): Promise<MongoClient> {
    const existingClient = this.clients.get(id);

    if (existingClient) {
      logSingleLineWarning(`MongoDB client with id '${id}' is already connected.`);
      return existingClient;
    }

    console.log(`Connecting MongoDB client to: ${redactUrl(url)}`);

    try {
      const newClient = new MongoClient(url, options);
      await newClient.connect();

      // Wrap close() method to intercept client closure
      const originalClose = newClient.close.bind(newClient);
      newClient.close = async (...args: Parameters<MongoClient["close"]>) => {
        this.clients.delete(id); // Remove reference to client from the list
        return originalClose(...args); // Call original close()
      };

      this.clients.set(id, newClient);
      return newClient;
    } catch (error: unknown) {
      logError("Failed to connect to MongoDB", error);
      const cause = error instanceof Error ? error : undefined;
      throw new DatabaseConnectionError(`Failed to connect to MongoDB with id '${id}'.`, cause);
    }
  }

  /**
   * Retrieves an existing MongoDB client by id.
   *
   * @param id The id identifying the connection.
   * @returns The MongoClient instance.
   * @throws DatabaseError if the client is not connected.
   */
  getClient(id: string): MongoClient {
    const client = this.clients.get(id);
    if (!client)
      throw new DatabaseConnectionError(
        `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
      );
    return client;
  }

  /**
   * Closes all MongoDB connections managed by this factory.
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients, async ([id, client]) => {
      try {
        await client.close();
        console.log(`Closed MongoDB connection for id '${id}'.`);
        return { status: "fulfilled", id };
      } catch (error: unknown) {
        logError(`Error closing MongoDB client '${id}'`, error);
        return { status: "rejected", id, reason: error };
      }
    });

    await Promise.allSettled(closePromises);
    this.clients.clear();
  }

  /**
   * Shutdown method for graceful shutdown.
   * Delegates to closeAll() to close all MongoDB connections.
   */
  async shutdown(): Promise<void> {
    await this.closeAll();
  }
}
