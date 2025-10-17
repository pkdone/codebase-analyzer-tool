import { MongoClient, MongoClientOptions, MongoError } from "mongodb";
import { injectable } from "tsyringe";
import { logErrorMsgAndDetail, logWarningMsg } from "../utils/logging";
import { redactUrl } from "../security/url-redactor";
import { IShutdownable } from "../interfaces/shutdownable.interface";

/**
 * A factory class for creating and managing MongoDB client connections.
 * This replaces the singleton pattern with dependency injection.
 */
@injectable()
export class MongoDBClientFactory implements IShutdownable {
  private readonly clients = new Map<string, MongoClient>();

  async connect(id: string, url: string, options?: MongoClientOptions): Promise<MongoClient> {
    const existingClient = this.clients.get(id);

    if (existingClient) {
      logWarningMsg(`MongoDB client with id '${id}' is already connected.`);
      return existingClient;
    }

    console.log(`Connecting MongoDB client to: ${redactUrl(url)}`);

    try {
      const newClient = new MongoClient(url, options);
      await newClient.connect();

      const originalClose = newClient.close.bind(newClient);
      newClient.close = async (...args: Parameters<MongoClient["close"]>) => {
        this.clients.delete(id);
        return originalClose(...args);
      };

      this.clients.set(id, newClient);
      return newClient;
    } catch (error: unknown) {
      logErrorMsgAndDetail("Failed to connect to MongoDB", error);
      throw new MongoError(`Failed to connect to MongoDB with id '${id}'.`);
    }
  }

  getClient(id: string): MongoClient {
    const client = this.clients.get(id);
    if (!client)
      throw new MongoError(
        `No active connection found for id '${id}'. Call \`connect(id, url)\` first.`,
      );
    return client;
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients, async ([id, client]) => {
      try {
        await client.close();
        console.log(`Closed MongoDB connection for id '${id}'.`);
        return { status: "fulfilled", id };
      } catch (error: unknown) {
        logErrorMsgAndDetail(`Error closing MongoDB client '${id}'`, error);
        return { status: "rejected", id, reason: error };
      }
    });

    await Promise.allSettled(closePromises);
    this.clients.clear();
  }

  async shutdown(): Promise<void> {
    await this.closeAll();
  }
}
