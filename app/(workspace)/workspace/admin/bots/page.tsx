import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  BotConfigurationForm,
  DeleteBotForm,
} from "@/components/knowledge/phase2-forms";
import { KnowledgeStudioNav } from "@/components/knowledge/studio-nav";
import { toggleBotAction } from "@/features/knowledge/actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

function questions(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function BotAdministrationPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const [bots, racks, dataSources, legacyApis, roles, users, providers] =
    await Promise.all([
      db.bot.findMany({
        where: { organizationId: context.organizationId },
        include: {
          providerConfig: true,
          knowledgeRacks: true,
          dataSources: true,
          legacyApis: true,
          access: true,
          _count: { select: { conversations: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.knowledgeRack.findMany({
        where: { organizationId: context.organizationId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.dataSource.findMany({
        where: {
          workspaceId: context.workspaceId,
          status: "CONNECTED",
          type: { in: ["MYSQL", "POSTGRESQL", "MSSQL", "ORACLE"] },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.legacyApi.findMany({
        where: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          enabled: true,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.role.findMany({
        where: { organizationId: context.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.user.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          memberships: { some: { organizationId: context.organizationId } },
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      db.llmProvider.findMany({
        where: { organizationId: context.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  const userChoices = users.map((user) => ({
    id: user.id,
    name: user.name ?? user.email,
  }));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot studio"
        description="Create versioned, grounded assistants and assign their model, knowledge, citations, memory, and role or user access."
      />
      <KnowledgeStudioNav />
      {bots.map((bot) => (
        <details
          key={bot.id}
          className="rounded-xl border bg-card p-5"
          open={bots.length === 1}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
            <span>
              <span className="font-semibold">{bot.name}</span>
              <span className="ml-3 text-sm text-muted-foreground">
                v{bot.currentVersion} · {bot._count.conversations} conversations
              </span>
            </span>
            <Badge tone={bot.active ? "success" : "neutral"}>
              {bot.active ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </summary>
          <div className="mt-5 border-t pt-5">
            <BotConfigurationForm
              bot={{
                id: bot.id,
                name: bot.name,
                description: bot.description,
                avatarUrl: bot.avatarUrl,
                systemPrompt: bot.systemPrompt,
                welcomeMessage: bot.welcomeMessage,
                suggestedQuestions: questions(bot.suggestedQuestions),
                active: bot.active,
                providerId: bot.providerConfig?.providerId ?? null,
                model: bot.providerConfig?.model ?? null,
                temperature: bot.providerConfig?.temperature ?? 0.1,
                maxTokens: bot.providerConfig?.maxTokens ?? 2048,
                contextSize: bot.providerConfig?.contextSize ?? 12000,
                citationEnabled: bot.providerConfig?.citationEnabled ?? true,
                memoryMode: bot.providerConfig?.memoryMode ?? "CONVERSATION",
                rackIds: bot.knowledgeRacks.map(({ rackId }) => rackId),
                dataSourceIds: bot.dataSources.map(
                  ({ dataSourceId }) => dataSourceId,
                ),
                legacyApiIds: bot.legacyApis.map(
                  ({ legacyApiId }) => legacyApiId,
                ),
                roleIds: bot.access.flatMap(({ roleId }) =>
                  roleId ? [roleId] : [],
                ),
                userIds: bot.access.flatMap(({ userId }) =>
                  userId ? [userId] : [],
                ),
              }}
              racks={racks}
              roles={roles}
              users={userChoices}
              providers={providers}
              dataSources={dataSources}
              legacyApis={legacyApis}
            />
            <div className="mt-4 flex flex-wrap gap-3 border-t pt-4">
              <form action={toggleBotAction}>
                <input type="hidden" name="id" value={bot.id} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!bot.active)}
                />
                <button className="min-h-10 rounded-lg border px-3 text-sm">
                  {bot.active ? "Deactivate bot" : "Activate bot"}
                </button>
              </form>
              <DeleteBotForm botId={bot.id} botName={bot.name} />
            </div>
          </div>
        </details>
      ))}
      <section className="rounded-xl border border-dashed bg-card p-5">
        <h2 className="mb-5 font-semibold">Create bot</h2>
        <BotConfigurationForm
          racks={racks}
          roles={roles}
          users={userChoices}
          providers={providers}
          dataSources={dataSources}
          legacyApis={legacyApis}
        />
      </section>
    </div>
  );
}
