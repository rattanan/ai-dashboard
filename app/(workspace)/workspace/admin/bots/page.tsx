import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteBotForm } from "@/components/knowledge/phase2-forms";
import { KnowledgeStudioNav } from "@/components/knowledge/studio-nav";
import { toggleBotAction } from "@/features/knowledge/actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function BotAdministrationPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const bots = await db.bot.findMany({
    where: { organizationId: context.organizationId },
    include: {
      providerConfig: { include: { chatEndpoint: true, provider: true } },
      _count: {
        select: {
          conversations: true,
          knowledgeRacks: true,
          dataSources: true,
          legacyApis: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot studio"
        description="Manage grounded assistants without mixing create and edit forms into the bot list."
        action={
          <Link
            href="/workspace/admin/bots/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create bot
          </Link>
        }
      />
      <KnowledgeStudioNav />
      <section className="grid gap-4 xl:grid-cols-2" aria-label="Bots">
        {bots.map((bot) => (
          <article key={bot.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{bot.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Version {bot.currentVersion} · {bot._count.conversations}{" "}
                  conversations
                </p>
              </div>
              <Badge tone={bot.active ? "success" : "neutral"}>
                {bot.active ? "ACTIVE" : "INACTIVE"}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Knowledge racks</dt>
                <dd className="font-medium">{bot._count.knowledgeRacks}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Databases</dt>
                <dd className="font-medium">{bot._count.dataSources}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">API tools</dt>
                <dd className="font-medium">{bot._count.legacyApis}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="truncate font-medium">
                  {bot.providerConfig?.chatEndpoint?.name ??
                    bot.providerConfig?.provider?.name ??
                    "Organization default"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              <Link
                href={`/workspace/admin/bots/${bot.id}/edit`}
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Edit bot
              </Link>
              <Link
                href={`/workspace/admin/bots/${bot.id}`}
                className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
              >
                View details
              </Link>
              <form action={toggleBotAction}>
                <input type="hidden" name="id" value={bot.id} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!bot.active)}
                />
                <button className="min-h-11 rounded-lg border px-4 text-sm font-medium">
                  {bot.active ? "Deactivate" : "Activate"}
                </button>
              </form>
              <DeleteBotForm botId={bot.id} botName={bot.name} />
            </div>
          </article>
        ))}
        {!bots.length ? (
          <div className="rounded-xl border border-dashed p-10 text-center xl:col-span-2">
            <p className="font-medium">No bots configured yet.</p>
            <Link
              href="/workspace/admin/bots/new"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Create the first bot
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
