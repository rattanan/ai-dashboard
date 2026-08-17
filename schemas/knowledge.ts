import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

export const botConfigurationSchema = z.object({
  botId: optionalId,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  systemPrompt: z.string().trim().min(20).max(8_000),
  welcomeMessage: z.string().trim().min(2).max(1_000),
  suggestedQuestions: z.array(z.string().trim().min(2).max(300)).max(8),
  active: z.preprocess((value) => value === "on", z.boolean()),
  providerId: optionalId,
  model: z.string().trim().max(200).optional(),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(128).max(32_000),
  contextSize: z.coerce.number().int().min(1_000).max(100_000),
  citationEnabled: z.preprocess((value) => value === "on", z.boolean()),
  memoryMode: z.enum(["NONE", "CONVERSATION", "USER_CONSENTED"]),
  rackIds: z.array(z.string().min(1)).max(50),
  dataSourceIds: z.array(z.string().min(1)).max(20),
  legacyApiIds: z.array(z.string().min(1)).max(20),
  roleIds: z.array(z.string().min(1)).max(50),
  userIds: z.array(z.string().min(1)).max(200),
});

export const knowledgeRackSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  roleIds: z.array(z.string().min(1)).max(50),
  accessLevel: z.enum(["READ", "UPLOAD", "MANAGE"]),
});

export const resourceIdSchema = z.object({ id: z.string().min(1) });

const scheduleFields = {
  scheduleEnabled: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  intervalMinutes: z.coerce.number().int().min(5).max(10_080),
};

export const sharedFolderSourceSchema = z.object({
  rackId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  rootPath: z.string().trim().min(1).max(2_000),
  includeSubdirectories: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  maxFiles: z.coerce.number().int().min(1).max(100_000),
  ...scheduleFields,
});

export const webSourceSchema = z.object({
  rackId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  url: z.string().url().max(2_000),
  allowedDomains: z.array(z.string().trim().min(1).max(253)).min(1).max(50),
  timeoutMs: z.coerce.number().int().min(1_000).max(60_000),
  maxBytes: z.coerce.number().int().min(1_024).max(26_214_400),
  maxRedirects: z.coerce.number().int().min(0).max(5),
  ...scheduleFields,
});

export const indexJobFilterSchema = z.object({
  status: z
    .enum([
      "QUEUED",
      "PROCESSING",
      "CANCEL_REQUESTED",
      "CANCELLED",
      "COMPLETED",
      "FAILED",
      "DEAD_LETTER",
    ])
    .optional(),
  sourceId: z.string().min(1).optional(),
});

export const chatRequestSchema = z.object({
  botId: z.string().min(1),
  conversationId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  message: z.string().trim().min(1).max(8_000),
});

export const conversationMutationSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().trim().min(2).max(120).optional(),
});

export const messageFeedbackSchema = z.object({
  messageId: z.string().min(1),
  rating: z.coerce
    .number()
    .int()
    .refine((value) => value === -1 || value === 1),
  comment: z.string().trim().max(1_000).optional(),
  reason: z
    .enum([
      "CORRECT",
      "CLEAR",
      "MISSING_INFORMATION",
      "INCORRECT",
      "OUTDATED",
      "OTHER",
    ])
    .optional(),
});
