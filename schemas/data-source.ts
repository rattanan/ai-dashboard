import { z } from "zod";

export const dataSourceTypeSchema = z.enum([
  "MYSQL",
  "POSTGRESQL",
  "MSSQL",
  "ORACLE",
  "EXCEL",
]);

export const databaseConnectionSchema = z.object({
  type: dataSourceTypeSchema.exclude(["EXCEL"]),
  name: z.string().trim().min(2).max(100),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  databaseName: z.string().trim().min(1).max(128),
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
  sslEnabled: z.coerce.boolean().default(false),
  connectionOptions: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .refine(
      (options) =>
        !Object.keys(options).some((key) =>
          /password|secret|token|credential/i.test(key),
        ),
      "Secrets are not allowed in advanced parameters",
    )
    .default({}),
});

export const dashboardObjectiveSchema = z.object({
  dataSourceId: z.string().min(1),
  dashboardId: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  businessArea: z.string().trim().min(2).max(120),
  businessObjective: z.string().trim().min(20).max(3000),
  businessQuestions: z.string().trim().max(2000).optional(),
  desiredKpis: z.string().trim().max(2000).optional(),
  targetUsers: z.string().trim().max(500).optional(),
  reportingPeriod: z.string().trim().max(500).optional(),
  importantFilters: z.string().trim().max(1000).optional(),
});

export const dashboardAppearanceSchema = z.object({
  dashboardId: z.string().min(1),
  layoutStyle: z.enum([
    "EXECUTIVE_OVERVIEW",
    "OPERATIONAL_MONITORING",
    "ANALYTICAL_EXPLORER",
    "CONTROL_CENTER",
    "CUSTOM",
  ]),
  visualStyle: z.enum([
    "CLEAN_PROFESSIONAL",
    "MODERN_ENTERPRISE",
    "MINIMAL_LIGHT",
    "DARK_CONTROL_ROOM",
    "DATA_DENSE",
  ]),
  visualTheme: z.enum(["BLUE", "EMERALD", "AMBER", "SLATE", "CUSTOM"]),
});

export const widgetConfigSchema = z.object({
  version: z.literal(1),
  query: z.string().max(10_000).optional(),
  visualization: z.record(z.string(), z.unknown()).default({}),
  filters: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const deleteDataSourceSchema = z.object({
  dataSourceId: z.string().min(1),
  confirmationName: z.string().trim().min(1),
});
