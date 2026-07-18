import type { DataSourceType } from "@/generated/prisma/enums";
import { MySqlConnector } from "./mysql";
import { UnsupportedConnector } from "./unsupported";
import type { ConnectorConfiguration, DataConnector } from "./types";

export function createConnector(
  type: DataSourceType,
  configuration: ConnectorConfiguration,
): DataConnector {
  if (type === "MYSQL") return new MySqlConnector(configuration);
  return new UnsupportedConnector(
    type === "POSTGRESQL" ? "PostgreSQL" : type,
    configuration,
  );
}
