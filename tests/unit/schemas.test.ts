import { describe, expect, it } from "vitest";
import { registerSchema } from "@/schemas/auth";
import { envSchema } from "@/schemas/env";
import {
  databaseConnectionSchema,
  dashboardObjectiveSchema,
  widgetConfigSchema,
} from "@/schemas/data-source";

describe("application schemas", () => {
  it("accepts a strong registration", () => {
    expect(
      registerSchema.safeParse({
        name: "Ada Lovelace",
        email: "ADA@example.com",
        password: "SecurePassword1",
      }).success,
    ).toBe(true);
  });
  it("rejects weak registration passwords", () => {
    expect(
      registerSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "password",
      }).success,
    ).toBe(false);
  });
  it("coerces a valid database port", () => {
    const result = databaseConnectionSchema.parse({
      type: "MYSQL",
      name: "Reporting",
      host: "localhost",
      port: "3306",
      databaseName: "analytics",
      username: "reader",
      password: "secret",
      sslEnabled: false,
      connectionOptions: {},
    });
    expect(result.port).toBe(3306);
  });
  it("requires a meaningful dashboard objective", () => {
    expect(
      dashboardObjectiveSchema.safeParse({
        dataSourceId: "source",
        name: "Sales",
        businessArea: "Sales",
        businessObjective: "too short",
      }).success,
    ).toBe(false);
  });
  it("versions widget JSON", () => {
    expect(widgetConfigSchema.parse({ version: 1 }).visualization).toEqual({});
  });
  it("parses Phase 1 limits and environment booleans safely", () => {
    const result = envSchema.parse({
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
      CREDENTIAL_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      AI_SEND_SAMPLE_DATA: "false",
      AI_MASK_SENSITIVE_DATA: "true",
      AI_MAX_TABLES: "12",
      QUERY_MAX_ROWS: "500",
    });
    expect(result.AI_SEND_SAMPLE_DATA).toBe(false);
    expect(result.AI_MASK_SENSITIVE_DATA).toBe(true);
    expect(result.AI_MAX_TABLES).toBe(12);
    expect(result.QUERY_MAX_ROWS).toBe(500);
  });
});
