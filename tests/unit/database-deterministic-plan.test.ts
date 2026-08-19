import { describe, expect, it } from "vitest";
import { planDeterministicDatabaseTextSearch } from "@/server/services/database-deterministic-plan";
import { validateGroundedReadOnlySql } from "@/server/connectors/sql-grounding";

const metadata = {
  dataSourceType: "MYSQL" as const,
  tables: [
    {
      schema: "nexif",
      name: "asast010",
      columns: [
        { name: "id" },
        { name: "code" },
        { name: "name" },
        { name: "dsca" },
      ],
    },
  ],
};

describe("planDeterministicDatabaseTextSearch", () => {
  it("builds a bounded read-only description search from approved metadata", () => {
    const plan = planDeterministicDatabaseTextSearch(
      "ช่วยหา asset ที่มี description เกี่ยวกับ filter",
      metadata,
    );
    expect(plan).toMatchObject({
      intent: "DATABASE",
      sql: "SELECT `id`, `code`, `name`, `dsca` FROM `nexif`.`asast010` WHERE LOWER(`dsca`) LIKE '%filter%' LIMIT 200",
      referencedTables: ["nexif.asast010"],
    });
    expect(
      validateGroundedReadOnlySql(
        plan?.sql ?? "",
        {
          dataSourceType: "MYSQL",
          tables: [
            {
              schema: "nexif",
              name: "asast010",
              kind: "TABLE",
              estimatedRowCount: null,
              columns: metadata.tables[0].columns.map((column, ordinal) => ({
                ...column,
                dataType: "varchar(255)",
                nullable: true,
                primaryKey: false,
                ordinal,
              })),
              omittedColumnCount: 0,
              sampleRows: [],
            },
          ],
          relationships: [],
        },
        200,
      ).ok,
    ).toBe(true);
  });

  it("does not guess when the request or metadata is ambiguous", () => {
    expect(
      planDeterministicDatabaseTextSearch("สรุปนโยบายวันลา", metadata),
    ).toBeNull();
    expect(
      planDeterministicDatabaseTextSearch(
        "Find description containing filter",
        { ...metadata, tables: [...metadata.tables, ...metadata.tables] },
      ),
    ).toBeNull();
  });
});
