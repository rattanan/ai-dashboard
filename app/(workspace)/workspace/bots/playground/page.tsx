import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
export default async function BotPlaygroundPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "bot.manage");
  const bots = await db.bot.findMany({
    where: { organizationId: context.organizationId },
    select: { id: true, name: true, description: true, active: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot playground"
        description="Choose a bot and test the real grounded pipeline before publishing. Admin traces are available in each bot detail page."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bots.map((bot) => (
          <article key={bot.id} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{bot.name}</h2>
            <p className="mt-2 min-h-10 text-sm text-muted-foreground">
              {bot.description}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/workspace/chat/${bot.id}`}
                className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Test chat
              </Link>
              <Link
                href={`/workspace/admin/bots/${bot.id}?tab=playground`}
                className="min-h-11 rounded-lg border px-4 py-2.5 text-sm font-medium"
              >
                Debug trace
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
