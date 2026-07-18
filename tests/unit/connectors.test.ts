import { describe, expect, it, vi } from "vitest";
import { createConnector } from "@/server/connectors/factory";
import { MySqlConnector } from "@/server/connectors/mysql";
import { ExcelUploadService } from "@/server/services/excel";

describe("connector boundaries", () => {
  it("creates the live MySQL adapter", () => {
    expect(createConnector("MYSQL", {})).toBeInstanceOf(MySqlConnector);
  });
  it("validates saved connector fields without requiring a wizard name", () => {
    const connector = new MySqlConnector({
      host: "127.0.0.1",
      port: 3306,
      databaseName: "analytics",
      username: "reader",
      password: "secret",
      sslEnabled: false,
      connectionOptions: {},
    });
    expect(connector.validateConfiguration().ok).toBe(true);
  });
  it("returns safe field diagnostics for incomplete connector settings", () => {
    const result = new MySqlConnector({}).validateConfiguration();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.diagnostics?.invalidFields).toContain("host");
      expect(JSON.stringify(result.error)).not.toContain('password":"');
    }
  });
  it("returns an explicit error for prepared adapters", async () => {
    const result = await createConnector("POSTGRESQL", {}).testConnection();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONNECTOR_NOT_IMPLEMENTED");
  });
  it("rejects invalid Excel extensions before storage", async () => {
    const storage = { put: vi.fn(), get: vi.fn(), delete: vi.fn() };
    const result = await new ExcelUploadService(storage).upload(
      new File(["text"], "notes.txt", { type: "text/plain" }),
    );
    expect(result.ok).toBe(false);
    expect(storage.put).not.toHaveBeenCalled();
  });
});
