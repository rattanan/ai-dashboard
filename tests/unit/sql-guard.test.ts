import { describe, expect, it } from "vitest";
import {
  validateOracleReadOnlySql,
  validateReadOnlySql,
} from "@/server/connectors/sql-guard";

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

describe("Oracle read-only SQL guard", () => {
  it.each([
    'SELECT * FROM "REPORTING"."ORDERS" FETCH FIRST 20 ROWS ONLY',
    "WITH totals AS (SELECT 1 AS n FROM dual) SELECT * FROM totals",
  ])("accepts safe query: %s", (sql) =>
    expect(validateOracleReadOnlySql(sql).ok).toBe(true),
  );

  it.each([
    "DELETE FROM orders",
    "BEGIN NULL; END;",
    "SELECT 1 FROM dual; DELETE FROM orders",
    "SELECT 1 -- bypass\n FROM dual",
  ])("rejects unsafe query: %s", (sql) =>
    expect(validateOracleReadOnlySql(sql).ok).toBe(false),
  );
});
