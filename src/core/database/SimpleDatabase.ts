import { PoolClient, QueryResult } from "pg";
import { connectWithRetry } from "../../config/database";
import { logger } from "../../config/logger";

/**
 * Thin database helper. Use `query` for raw SQL (the bulk of this app, ported
 * from the Java repositories' @Query strings) and `withTransaction` for the
 * multi-statement service methods that were @Transactional in Java.
 */
export class SimpleDatabase {
  static async query(text: string, params: any[] = []): Promise<QueryResult<any>> {
    const client = await connectWithRetry();
    try {
      return (await client.query(text, params)) as any;
    } finally {
      client.release();
    }
  }

  static async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectWithRetry();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async isHealthy(): Promise<boolean> {
    try {
      await this.query("SELECT 1");
      return true;
    } catch (error) {
      logger.error({ error }, "Database health check failed");
      return false;
    }
  }
}
