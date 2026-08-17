import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
export default async function BotIntegrationsPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const bots = await db.bot.findMany({
    where: { organizationId: context.organizationId },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Embed & Integration"
        description="Manage backward-compatible widget embed code and authentication configuration per bot."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {bots.map((bot) => (
          <article key={bot.id} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{bot.name}</h2>
            <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-white">{`<script src="/widget/v1.js" data-bot-id="${bot.id}" async></script>`}</pre>
            <Link
              href={`/workspace/admin/bots/${bot.id}?tab=embed-integration`}
              className="mt-4 inline-block min-h-11 rounded-lg border px-4 py-2.5 text-sm font-medium"
            >
              Appearance & authentication
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
