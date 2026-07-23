import type { Prisma } from "@/generated/prisma/client";
import path from "node:path";
import type { AuthorizationContext } from "@/server/auth/authorization";
import { createConnector } from "@/server/connectors/factory";
import type { ConnectorConfiguration } from "@/server/connectors/types";
import { db } from "@/server/db";
import { AesGcmCredentialEncryptionService } from "@/server/services/encryption";
import { logger } from "@/server/services/logger";
import { env } from "@/schemas/env";
import { failure, success } from "@/types/result";
import { dataSourceRepository } from "@/server/repositories/data-sources";
import { LocalObjectStorageService } from "@/server/storage/local-storage";

function encryptionService() {
  const config = env();
  return new AesGcmCredentialEncryptionService(
    Buffer.from(
      config.DATA_SOURCE_ENCRYPTION_KEY ?? config.CREDENTIAL_ENCRYPTION_KEY,
      "base64",
    ),
    config.CREDENTIAL_KEY_VERSION,
  );
}

export async function getDataSourceConnector(
  context: AuthorizationContext,
  id: string,
) {
  const source = await dataSourceRepository.find(context, id);
  if (!source) return failure("NOT_FOUND", "Data source not found.");
  let password: string | undefined;
  if (source.credential) {
    const plaintext = encryptionService().decrypt(source.credential);
    password = (JSON.parse(plaintext) as { password: string }).password;
  }
  const configuration: ConnectorConfiguration = {
    dataSourceId: source.id,
    host: source.host ?? undefined,
    port: source.port ?? undefined,
    databaseName: source.databaseName ?? undefined,
    username: source.username ?? undefined,
    password,
    sslEnabled: source.sslEnabled,
    connectionOptions:
      (source.connectionOptions as ConnectorConfiguration["connectionOptions"]) ??
      {},
    oracle:
      source.type === "ORACLE"
        ? (source.connectionOptions as ConnectorConfiguration["oracle"])
        : undefined,
  };
  return success({
    source,
    connector: createConnector(source.type, configuration),
  });
}

export async function testDataSource(
  context: AuthorizationContext,
  id: string,
) {
  const resolved = await getDataSourceConnector(context, id);
  if (!resolved.ok) return resolved;
  const { connector, source } = resolved.data;
  await db.dataSource.update({
    where: { id: source.id },
    data: { status: "TESTING" },
  });
  try {
    const result = await connector.testConnection();
    await db.$transaction([
      db.dataSource.update({
        where: { id: source.id },
        data: {
          status: result.ok ? "CONNECTED" : "FAILED",
          lastTestedAt: new Date(),
          lastConnectedAt: result.ok ? new Date() : source.lastConnectedAt,
        },
      }),
      db.auditLog.create({
        data: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          actorId: context.userId,
          action: "DATA_SOURCE_TESTED",
          entityType: "DataSource",
          entityId: source.id,
          outcome: result.ok ? "SUCCESS" : "FAILURE",
          metadata: result.ok
            ? { latencyMs: result.data.latencyMs }
            : { code: result.error.code },
        },
      }),
    ]);
    return result;
  } finally {
    await connector.close();
  }
}

export async function discoverDataSource(
  context: AuthorizationContext,
  id: string,
) {
  const resolved = await getDataSourceConnector(context, id);
  if (!resolved.ok) return resolved;
  const { connector, source } = resolved.data;
  if (source.type !== "MYSQL" && source.type !== "ORACLE")
    return failure(
      "CONNECTOR_NOT_IMPLEMENTED",
      `${source.type} metadata discovery is planned for a later phase.`,
    );
  try {
    const schemas = await connector.listSchemas();
    if (!schemas.ok) return schemas;
    const schemaNames = schemas.data.map((item) => item.name);
    const [tables, columns, relationships] = await Promise.all([
      connector.listTables(schemaNames),
      connector.listColumns(schemaNames),
      connector.listRelationships(schemaNames),
    ]);
    if (!tables.ok) return tables;
    if (!columns.ok) return columns;
    if (!relationships.ok) return relationships;

    await db.$transaction(async (tx) => {
      await tx.dataSourceSchema.deleteMany({
        where: { dataSourceId: source.id },
      });
      const tableIds = new Map<string, string>();
      for (const schema of schemas.data) {
        const createdSchema = await tx.dataSourceSchema.create({
          data: { dataSourceId: source.id, name: schema.name },
        });
        for (const table of tables.data.filter(
          (item) => item.schemaName === schema.name,
        )) {
          const createdTable = await tx.dataSourceTable.create({
            data: {
              schemaId: createdSchema.id,
              name: table.name,
              tableType: table.tableType,
              estimatedRowCount: table.estimatedRowCount,
            },
          });
          tableIds.set(`${schema.name}.${table.name}`, createdTable.id);
          const tableColumns = columns.data.filter(
            (item) =>
              item.schemaName === schema.name && item.tableName === table.name,
          );
          if (tableColumns.length)
            await tx.dataSourceColumn.createMany({
              data: tableColumns.map((column) => ({
                tableId: createdTable.id,
                name: column.name,
                dataType: column.dataType,
                ordinal: column.ordinal,
                nullable: column.nullable,
                primaryKey: column.primaryKey,
                defaultValue: column.defaultValue,
              })),
            });
        }
      }
      for (const relation of relationships.data) {
        const fromTableId = tableIds.get(
          `${relation.fromSchema}.${relation.fromTable}`,
        );
        const toTableId = tableIds.get(
          `${relation.toSchema}.${relation.toTable}`,
        );
        if (fromTableId && toTableId)
          await tx.dataSourceRelationship.create({
            data: {
              name: relation.name,
              fromTableId,
              fromColumnName: relation.fromColumn,
              toTableId,
              toColumnName: relation.toColumn,
            },
          });
      }
      await tx.dataSource.update({
        where: { id: source.id },
        data: { lastDiscoveredAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          actorId: context.userId,
          action: "METADATA_DISCOVERED",
          entityType: "DataSource",
          entityId: source.id,
          metadata: {
            schemas: schemas.data.length,
            tables: tables.data.length,
            columns: columns.data.length,
          },
        },
      });
    });
    return success({
      schemas: schemas.data.length,
      tables: tables.data.length,
      columns: columns.data.length,
    });
  } catch (error) {
    logger.error("Metadata discovery failed", { dataSourceId: id, error });
    return failure(
      "CONNECTION_FAILED",
      "Metadata discovery failed. Verify that the database user can read the permitted metadata views.",
    );
  } finally {
    await connector.close();
  }
}

export async function createDatabaseDataSource(
  context: AuthorizationContext,
  input: {
    type: "MYSQL" | "POSTGRESQL" | "MSSQL" | "ORACLE";
    name: string;
    host: string;
    port: number;
    databaseName?: string;
    username: string;
    password: string;
    sslEnabled: boolean;
    connectionOptions: Record<string, string | number | boolean>;
    connectionType?: "service_name" | "sid";
    serviceName?: string;
    sid?: string;
    schema?: string;
    sslMode?: "disable" | "prefer" | "require";
    connectionTimeoutMs?: number;
  },
) {
  const encrypted = encryptionService().encrypt(
    JSON.stringify({ password: input.password }),
  );
  const source = await db.$transaction(async (tx) => {
    const created = await tx.dataSource.create({
      data: {
        workspaceId: context.workspaceId,
        name: input.name,
        type: input.type,
        host: input.host,
        port: input.port,
        databaseName:
          input.type === "ORACLE"
            ? (input.serviceName ?? input.sid ?? null)
            : input.databaseName,
        username: input.username,
        sslEnabled: input.sslEnabled,
        connectionOptions: (input.type === "ORACLE"
          ? {
              connectionType: input.connectionType!,
              serviceName: input.serviceName,
              sid: input.sid,
              schema: input.schema,
              sslMode: input.sslMode,
              connectionTimeoutMs: input.connectionTimeoutMs,
            }
          : input.connectionOptions) as Prisma.InputJsonValue,
        createdById: context.userId,
        credential: { create: encrypted },
        access: {
          create: {
            organizationId: context.organizationId,
            userId: context.userId,
            grantedById: context.userId,
            canPreview: true,
            canBuild: true,
            canManage: true,
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "DATA_SOURCE_CREATED",
        entityType: "DataSource",
        entityId: created.id,
        metadata: { type: created.type },
      },
    });
    return created;
  });
  return success({
    id: source.id,
    status: source.status,
    hasStoredCredential: true,
  });
}

export async function deleteDataSource(
  context: AuthorizationContext,
  id: string,
  confirmationName: string,
) {
  const source = await db.dataSource.findFirst({
    where: { id, workspaceId: context.workspaceId },
    include: {
      file: { select: { storageKey: true } },
      _count: { select: { dashboards: true } },
    },
  });
  if (!source) return failure("NOT_FOUND", "Data source not found.");
  if (confirmationName !== source.name) {
    return failure(
      "VALIDATION_ERROR",
      "The confirmation name does not match the data source name.",
      {
        fieldErrors: {
          confirmationName: ["Enter the exact data source name."],
        },
      },
    );
  }

  const requestId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.dataSource.delete({
      where: { id: source.id, workspaceId: context.workspaceId },
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "DATA_SOURCE_DELETED",
        entityType: "DataSource",
        entityId: source.id,
        requestId,
        metadata: {
          name: source.name,
          type: source.type,
          detachedDashboards: source._count.dashboards,
          hadStoredFile: Boolean(source.file),
        },
      },
    });
  });

  if (source.file) {
    try {
      const config = env();
      if (config.OBJECT_STORAGE_DRIVER === "local") {
        await new LocalObjectStorageService(
          path.resolve(config.LOCAL_STORAGE_PATH),
        ).delete(source.file.storageKey);
      }
    } catch (error) {
      logger.error("Deleted data source left an object-storage orphan", {
        requestId,
        dataSourceId: source.id,
        storageKey: source.file.storageKey,
        error,
      });
    }
  }

  return success({ deleted: true as const, id: source.id });
}
