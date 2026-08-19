import type { DatabaseQueryPlan } from "@/schemas/database-intelligence";

type DatabaseSourceType = "MYSQL" | "POSTGRESQL" | "MSSQL" | "ORACLE";

type TextSearchMetadata = {
  dataSourceType: DatabaseSourceType;
  tables: Array<{
    schema: string;
    name: string;
    columns: Array<{ name: string }>;
  }>;
};

const descriptionAliases = new Set([
  "description",
  "desc",
  "dsca",
  "desp",
  "details",
  "detail",
  "comment",
  "note",
]);

function quotedIdentifier(value: string, dialect: DatabaseSourceType) {
  if (dialect === "MYSQL") return `\`${value.replaceAll("`", "``")}\``;
  if (dialect === "MSSQL") return `[${value.replaceAll("]", "]]")}]`;
  return `"${value.replaceAll('"', '""')}"`;
}

function searchTerm(question: string) {
  return question.match(
    /(?:เกี่ยวกับ|มีคำว่า|ประกอบด้วย|containing|contains|about|matching|like)\s*["“”']?([\p{L}\p{N}_-]{2,100})/iu,
  )?.[1];
}

export function planDeterministicDatabaseTextSearch(
  question: string,
  metadata: TextSearchMetadata,
): DatabaseQueryPlan | null {
  if (metadata.tables.length !== 1) return null;
  if (!/\b(description|desc)\b|คำอธิบาย/iu.test(question)) return null;
  const term = searchTerm(question);
  if (!term) return null;

  const table = metadata.tables[0];
  const searchColumn = table.columns.find((column) =>
    descriptionAliases.has(column.name.toLocaleLowerCase()),
  );
  if (!searchColumn) return null;

  const preferredOutput = new Set(["id", "code", "name"]);
  const outputColumns = table.columns.filter(
    (column) =>
      preferredOutput.has(column.name.toLocaleLowerCase()) ||
      column.name === searchColumn.name,
  );
  const dialect = metadata.dataSourceType;
  const select = outputColumns
    .map((column) => quotedIdentifier(column.name, dialect))
    .join(", ");
  const tableName = `${quotedIdentifier(table.schema, dialect)}.${quotedIdentifier(table.name, dialect)}`;
  const columnName = quotedIdentifier(searchColumn.name, dialect);
  const escapedTerm = term.replaceAll("'", "''").toLocaleLowerCase();
  const selectKeyword = dialect === "MSSQL" ? "SELECT TOP 200" : "SELECT";
  const rowLimit =
    dialect === "ORACLE"
      ? " FETCH FIRST 200 ROWS ONLY"
      : dialect === "MSSQL"
        ? ""
        : " LIMIT 200";

  return {
    intent: "DATABASE",
    clarification: null,
    sql: `${selectKeyword} ${select} FROM ${tableName} WHERE LOWER(${columnName}) LIKE '%${escapedTerm}%'${rowLimit}`,
    explanation: `Search ${table.schema}.${table.name}.${searchColumn.name} for text containing the requested term.`,
    referencedTables: [`${table.schema}.${table.name}`],
  };
}
