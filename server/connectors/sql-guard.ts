import { Parser } from "node-sql-parser";
import { failure, success, type AppResult } from "@/types/result";

const parser = new Parser();
const FORBIDDEN =
  /\b(insert|update|delete|replace|drop|alter|truncate|grant|revoke|execute|call|load\s+data|into\s+(out|dump)file|for\s+update|lock\s+in\s+share\s+mode)\b/i;

export function validateReadOnlySql(sql: string): AppResult<{ sql: string }> {
  const trimmed = sql.trim();
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .trim();
  const parseTarget = withoutComments.replace(/;\s*$/, "");
  if (
    !withoutComments ||
    trimmed.length > 100_000 ||
    FORBIDDEN.test(withoutComments)
  ) {
    return failure(
      "UNSAFE_QUERY",
      "Only a single read-only SELECT query is allowed.",
    );
  }
  try {
    const ast = parser.astify(parseTarget, { database: "MySQL" });
    if (Array.isArray(ast) || !ast || ast.type !== "select") {
      return failure(
        "UNSAFE_QUERY",
        "Only a single read-only SELECT query is allowed.",
      );
    }
    return success({ sql: parseTarget });
  } catch {
    return failure(
      "UNSAFE_QUERY",
      "The query could not be parsed as a safe read-only statement.",
    );
  }
}
