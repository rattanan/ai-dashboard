import { describe, expect, it } from "vitest";
import { validateReadOnlySql } from "@/server/connectors/sql-guard";

describe("read-only SQL guard", () => {
  it.each([
    "SELECT id, name FROM customers LIMIT 10",
    "WITH recent AS (SELECT id FROM orders) SELECT * FROM recent",
    "/* dashboard query */ SELECT COUNT(*) AS total FROM orders;",
  ])("accepts safe query: %s", (sql) =>
    expect(validateReadOnlySql(sql).ok).toBe(true),
  );

  it.each([
    "DELETE FROM orders",
    "SELECT * FROM users; DROP TABLE users",
    "SELECT * FROM users FOR UPDATE",
    "SELECT * FROM users INTO OUTFILE '/tmp/users'",
    "CALL refresh_dashboard()",
    "nonsense that is not sql",
  ])("rejects unsafe query: %s", (sql) =>
    expect(validateReadOnlySql(sql).ok).toBe(false),
  );
});
