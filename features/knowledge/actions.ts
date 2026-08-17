"use server";

import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import {
  botConfigurationSchema,
  knowledgeRackSchema,
  resourceIdSchema,
} from "@/schemas/knowledge";
import { retryDocumentIndex } from "@/server/services/knowledge-service";
import { failure, success } from "@/types/result";
import { authorizeResource } from "@/server/auth/resource-authorization";

function botFormValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    suggestedQuestions: String(formData.get("suggestedQuestions") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    rackIds: formData.getAll("rackIds"),
    dataSourceIds: formData.getAll("dataSourceIds"),
    legacyApiIds: formData.getAll("legacyApiIds"),
    roleIds: formData.getAll("roleIds"),
    userIds: formData.getAll("userIds"),
  };
}

export async function saveBotAction(_state: unknown, formData: FormData) {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const parsed = botConfigurationSchema.safeParse(botFormValues(formData));
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "Check the bot configuration.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  const [
    rackCount,
    dataSourceCount,
    legacyApiCount,
    roleCount,
    userCount,
    providerCount,
    chatEndpointCount,
  ] = await Promise.all([
    db.knowledgeRack.count({
      where: {
        id: { in: parsed.data.rackIds },
        organizationId: context.organizationId,
      },
    }),
    db.dataSource.count({
      where: {
        id: { in: parsed.data.dataSourceIds },
        workspaceId: context.workspaceId,
        status: "CONNECTED",
        type: { in: ["MYSQL", "POSTGRESQL", "MSSQL", "ORACLE"] },
      },
    }),
    db.legacyApi.count({
      where: {
        id: { in: parsed.data.legacyApiIds },
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        enabled: true,
      },
    }),
    db.role.count({
      where: {
        id: { in: parsed.data.roleIds },
        organizationId: context.organizationId,
      },
    }),
    db.organizationMember.count({
      where: {
        userId: { in: parsed.data.userIds },
        organizationId: context.organizationId,
        user: { status: "ACTIVE", deletedAt: null },
      },
    }),
    parsed.data.providerId
      ? db.llmProvider.count({
          where: {
            id: parsed.data.providerId,
            organizationId: context.organizationId,
          },
        })
      : Promise.resolve(1),
    parsed.data.chatEndpointId
      ? db.aiEndpointConfig.count({
          where: {
            id: parsed.data.chatEndpointId,
            organizationId: context.organizationId,
            kind: "CHAT",
          },
        })
      : Promise.resolve(1),
  ]);
  if (
    rackCount !== new Set(parsed.data.rackIds).size ||
    dataSourceCount !== new Set(parsed.data.dataSourceIds).size ||
    legacyApiCount !== new Set(parsed.data.legacyApiIds).size ||
    roleCount !== new Set(parsed.data.roleIds).size ||
    userCount !== new Set(parsed.data.userIds).size ||
    providerCount !== 1 ||
    chatEndpointCount !== 1
  )
    return failure(
      "VALIDATION_ERROR",
      "Bot scope contains an invalid resource.",
    );
  const assignmentDecisions = await Promise.all([
    ...parsed.data.rackIds.map((id) =>
      authorizeResource(context, "KNOWLEDGE_RACK", id, "MANAGE"),
    ),
    ...parsed.data.dataSourceIds.map((id) =>
      authorizeResource(context, "DATA_SOURCE", id, "MANAGE"),
    ),
    ...parsed.data.legacyApiIds.map((id) =>
      authorizeResource(context, "LEGACY_API", id, "MANAGE"),
    ),
  ]);
  if (assignmentDecisions.some(({ allowed }) => !allowed))
    return failure(
      "FORBIDDEN",
      "You cannot assign one or more selected sources to this bot.",
    );
  try {
    const saved = await db.$transaction(async (tx) => {
      const existing = parsed.data.botId
        ? await tx.bot.findFirst({
            where: {
              id: parsed.data.botId,
              organizationId: context.organizationId,
            },
          })
        : null;
      if (parsed.data.botId && !existing) throw new Error("BOT_NOT_FOUND");
      const version = existing ? existing.currentVersion + 1 : 1;
      const botData = {
        name: parsed.data.name,
        description: parsed.data.description,
        avatarUrl: parsed.data.avatarUrl,
        systemPrompt: parsed.data.systemPrompt,
        welcomeMessage: parsed.data.welcomeMessage,
        suggestedQuestions: parsed.data.suggestedQuestions,
        active: parsed.data.active,
        fallbackMessage: parsed.data.fallbackMessage,
        apiToolsEnabled: parsed.data.apiToolsEnabled,
        databaseToolsEnabled: parsed.data.databaseToolsEnabled,
        primaryColor: parsed.data.primaryColor,
        headerColor: parsed.data.headerColor,
        chatBubbleColor: parsed.data.chatBubbleColor,
        fontFamily: parsed.data.fontFamily,
        colorMode: parsed.data.colorMode,
        launcherIcon: parsed.data.launcherIcon,
        windowPosition: parsed.data.windowPosition,
        placeholder: parsed.data.placeholder,
        brandingEnabled: parsed.data.brandingEnabled,
        currentVersion: version,
      };
      const bot = existing
        ? await tx.bot.update({ where: { id: existing.id }, data: botData })
        : await tx.bot.create({
            data: {
              ...botData,
              organizationId: context.organizationId,
              createdById: context.userId,
            },
          });
      const providerConfiguration = {
        providerId: parsed.data.providerId ?? null,
        chatEndpointId: parsed.data.chatEndpointId ?? null,
        model: parsed.data.model || null,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
        contextSize: parsed.data.contextSize,
        citationEnabled: parsed.data.citationEnabled,
        memoryMode: parsed.data.memoryMode,
      };
      await tx.botProviderConfig.upsert({
        where: { botId: bot.id },
        update: providerConfiguration,
        create: { botId: bot.id, ...providerConfiguration },
      });
      await tx.botKnowledgeRack.deleteMany({ where: { botId: bot.id } });
      if (parsed.data.rackIds.length)
        await tx.botKnowledgeRack.createMany({
          data: parsed.data.rackIds.map((rackId) => ({
            botId: bot.id,
            rackId,
          })),
        });
      const selectedSources = parsed.data.rackIds.length
        ? await tx.knowledgeSource.findMany({
            where: { rackId: { in: parsed.data.rackIds } },
            select: { id: true },
          })
        : [];
      await tx.botKnowledgeSource.deleteMany({ where: { botId: bot.id } });
      if (selectedSources.length)
        await tx.botKnowledgeSource.createMany({
          data: selectedSources.map((source, index) => ({
            botId: bot.id,
            sourceId: source.id,
            enabled: true,
            priority: 100 + index,
          })),
        });
      await tx.botDataSource.deleteMany({ where: { botId: bot.id } });
      if (parsed.data.dataSourceIds.length)
        await tx.botDataSource.createMany({
          data: parsed.data.dataSourceIds.map((dataSourceId) => ({
            botId: bot.id,
            dataSourceId,
          })),
        });
      await tx.botLegacyApi.deleteMany({ where: { botId: bot.id } });
      if (parsed.data.legacyApiIds.length)
        await tx.botLegacyApi.createMany({
          data: parsed.data.legacyApiIds.map((legacyApiId) => ({
            botId: bot.id,
            legacyApiId,
          })),
        });
      await tx.botAccess.deleteMany({
        where: { botId: bot.id },
      });
      if (parsed.data.roleIds.length)
        await tx.botAccess.createMany({
          data: parsed.data.roleIds.map((roleId) => ({
            organizationId: context.organizationId,
            botId: bot.id,
            roleId,
            level: "USE" as const,
          })),
        });
      if (parsed.data.userIds.length)
        await tx.botAccess.createMany({
          data: parsed.data.userIds.map((userId) => ({
            organizationId: context.organizationId,
            botId: bot.id,
            userId,
            level: "USE" as const,
          })),
        });
      const snapshot = {
        ...botData,
        ...providerConfiguration,
        rackIds: parsed.data.rackIds,
        dataSourceIds: parsed.data.dataSourceIds,
        legacyApiIds: parsed.data.legacyApiIds,
        roleIds: parsed.data.roleIds,
        userIds: parsed.data.userIds,
      } as Prisma.InputJsonValue;
      await tx.botVersion.create({
        data: {
          botId: bot.id,
          version,
          configuration: snapshot,
          createdById: context.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          actorId: context.userId,
          action: existing ? "BOT_UPDATED" : "BOT_CREATED",
          entityType: "Bot",
          entityId: bot.id,
          entityName: bot.name,
          beforeValue: existing
            ? { version: existing.currentVersion, active: existing.active }
            : undefined,
          afterValue: {
            version,
            active: bot.active,
            rackCount: parsed.data.rackIds.length,
            dataSourceCount: parsed.data.dataSourceIds.length,
            legacyApiCount: parsed.data.legacyApiIds.length,
            roleCount: parsed.data.roleIds.length,
            userCount: parsed.data.userIds.length,
          },
        },
      });
      return bot;
    });
    revalidatePath("/workspace/admin/bots");
    revalidatePath("/workspace/bots");
    return success({ id: saved.id });
  } catch (error) {
    if (error instanceof Error && error.message === "BOT_NOT_FOUND")
      return failure("NOT_FOUND", "Bot not found.");
    return failure("CONFLICT", "A bot with this name already exists.");
  }
}

export async function toggleBotAction(formData: FormData) {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const parsed = resourceIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = formData.get("active") === "true";
  const bot = await db.bot.findFirst({
    where: { id: parsed.data.id, organizationId: context.organizationId },
  });
  if (!bot) return;
  await db.$transaction([
    db.bot.update({ where: { id: bot.id }, data: { active } }),
    db.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: active ? "BOT_ACTIVATED" : "BOT_DEACTIVATED",
        entityType: "Bot",
        entityId: bot.id,
        entityName: bot.name,
        beforeValue: { active: bot.active },
        afterValue: { active },
      },
    }),
  ]);
  revalidatePath("/workspace/admin/bots");
  revalidatePath("/workspace/bots");
}

export async function deleteBotAction(formData: FormData) {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const parsed = resourceIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const bot = await db.bot.findFirst({
    where: { id: parsed.data.id, organizationId: context.organizationId },
  });
  if (!bot) return;
  await db.$transaction(async (tx) => {
    await tx.bot.delete({ where: { id: bot.id } });
    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "BOT_DELETED",
        entityType: "Bot",
        entityId: bot.id,
        entityName: bot.name,
        beforeValue: { active: bot.active, version: bot.currentVersion },
      },
    });
  });
  revalidatePath("/workspace/admin/bots");
  revalidatePath("/workspace/bots");
}

export async function createKnowledgeRackAction(
  _state: unknown,
  formData: FormData,
) {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const parsed = knowledgeRackSchema.safeParse({
    ...Object.fromEntries(formData),
    roleIds: formData.getAll("roleIds"),
  });
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "Check the knowledge rack details.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  const roleCount = await db.role.count({
    where: {
      id: { in: parsed.data.roleIds },
      organizationId: context.organizationId,
    },
  });
  if (roleCount !== new Set(parsed.data.roleIds).size)
    return failure("VALIDATION_ERROR", "Knowledge rack roles are invalid.");
  try {
    const rack = await db.$transaction(async (tx) => {
      const created = await tx.knowledgeRack.create({
        data: {
          organizationId: context.organizationId,
          name: parsed.data.name,
          description: parsed.data.description,
          createdById: context.userId,
          sources: { create: { name: "Files", type: "FILE" } },
          access: {
            create: [
              {
                organizationId: context.organizationId,
                userId: context.userId,
                level: "MANAGE",
              },
              ...parsed.data.roleIds.map((roleId) => ({
                organizationId: context.organizationId,
                roleId,
                level: parsed.data.accessLevel,
              })),
            ],
          },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          actorId: context.userId,
          action: "KNOWLEDGE_RACK_CREATED",
          entityType: "KnowledgeRack",
          entityId: created.id,
          entityName: created.name,
          afterValue: {
            roleIds: parsed.data.roleIds,
            roleAccessLevel: parsed.data.accessLevel,
          },
        },
      });
      return created;
    });
    revalidatePath("/workspace/admin/knowledge");
    return success({ id: rack.id });
  } catch {
    return failure(
      "CONFLICT",
      "A knowledge rack with this name already exists.",
    );
  }
}

export async function retryDocumentIndexAction(formData: FormData) {
  const context = await requireAuthorization();
  const parsed = resourceIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await retryDocumentIndex(context, parsed.data.id);
  revalidatePath("/workspace/admin/knowledge");
}
