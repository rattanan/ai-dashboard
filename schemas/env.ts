import { z } from "zod";

const environmentBoolean = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  CREDENTIAL_ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "Must be a base64-encoded 32-byte key"),
  DATA_SOURCE_ENCRYPTION_KEY: z
    .string()
    .refine((value) => {
      try {
        return Buffer.from(value, "base64").length === 32;
      } catch {
        return false;
      }
    }, "Must be a base64-encoded 32-byte key")
    .optional(),
  CREDENTIAL_KEY_VERSION: z.string().default("env-v1"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  OBJECT_STORAGE_DRIVER: z.enum(["local", "gcs"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default(".data/uploads"),
  MAX_EXCEL_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10_485_760),
  MAX_EXCEL_IMPORT_ROWS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(100_000),
  MAX_EXCEL_SHEETS: z.coerce.number().int().min(1).max(200).default(50),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  AI_PROVIDER: z.enum(["openai-compatible"]).default("openai-compatible"),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_SUPPORTS_JSON_SCHEMA: environmentBoolean.default(true),
  AI_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(300_000)
    .default(60_000),
  AI_STREAM_INACTIVITY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(300_000)
    .default(60_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  AI_MAX_TABLES: z.coerce.number().int().min(1).max(100).default(30),
  AI_MAX_COLUMNS_PER_TABLE: z.coerce.number().int().min(1).max(500).default(80),
  AI_SAMPLE_ROWS_PER_TABLE: z.coerce.number().int().min(0).max(20).default(5),
  AI_MAX_SAMPLE_CELL_LENGTH: z.coerce
    .number()
    .int()
    .min(20)
    .max(2_000)
    .default(200),
  AI_MAX_CONTEXT_CHARACTERS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(500_000)
    .default(120_000),
  AI_SEND_SAMPLE_DATA: environmentBoolean.default(true),
  AI_MASK_SENSITIVE_DATA: environmentBoolean.default(true),
  AI_MAX_KPI_RECOMMENDATIONS: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(12),
  AI_MAX_WIDGETS: z.coerce.number().int().min(1).max(50).default(12),
  AI_MAX_INSIGHTS: z.coerce.number().int().min(0).max(50).default(8),
  QUERY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(60_000)
    .default(10_000),
  QUERY_MAX_ROWS: z.coerce.number().int().min(1).max(10_000).default(1_000),
  QUERY_PREVIEW_ROWS: z.coerce.number().int().min(1).max(1_000).default(100),
  INITIAL_ADMIN_NAME: z.string().min(2).optional(),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_USERNAME: z.string().min(3).max(64).optional(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).optional(),
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(30),
  PASSWORD_RESET_DELIVERY_URL: z.string().url().optional(),
  PASSWORD_RESET_DELIVERY_TOKEN: z.string().min(16).optional(),
  MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(30),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(15),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .default(20),
  SEED_DEVELOPMENT_TEST_USERS: environmentBoolean.default(false),
  DEVELOPMENT_TEST_USER_PASSWORD: z.string().min(12).optional(),
});

export type AppEnvironment = z.infer<typeof envSchema>;

let cached: AppEnvironment | undefined;
export function env(): AppEnvironment {
  cached ??= envSchema.parse(process.env);
  return cached;
}
