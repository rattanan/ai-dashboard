import type { AppResult } from "@/types/result";

export type ConnectorConfiguration = {
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  sslEnabled?: boolean;
  connectionOptions?: Record<string, string | number | boolean>;
};

export type DiscoveredSchema = { name: string };
export type DiscoveredTable = {
  schemaName: string;
  name: string;
  tableType: "TABLE" | "VIEW";
  estimatedRowCount: bigint | null;
};
export type DiscoveredColumn = {
  schemaName: string;
  tableName: string;
  name: string;
  dataType: string;
  ordinal: number;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue: string | null;
};
export type DiscoveredRelationship = {
  name: string;
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
};

export interface DataConnector {
  validateConfiguration(): AppResult<{ valid: true }>;
  testConnection(): Promise<
    AppResult<{
      latencyMs: number;
      serverVersion?: string;
      engine?: "MYSQL" | "MARIADB";
      compatibilityWarning?: string;
    }>
  >;
  listSchemas(): Promise<AppResult<DiscoveredSchema[]>>;
  listTables(schemaNames?: string[]): Promise<AppResult<DiscoveredTable[]>>;
  listColumns(schemaNames?: string[]): Promise<AppResult<DiscoveredColumn[]>>;
  listRelationships(
    schemaNames?: string[],
  ): Promise<AppResult<DiscoveredRelationship[]>>;
  fetchSample(
    schemaName: string,
    tableName: string,
    limit?: number,
  ): Promise<AppResult<Record<string, unknown>[]>>;
  executeReadOnlyQuery(
    sql: string,
    options?: { timeoutMs?: number },
  ): Promise<AppResult<Record<string, unknown>[]>>;
  close(): Promise<void>;
}
