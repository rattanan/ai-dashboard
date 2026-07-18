import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { requireAuthorization } from "@/server/auth/authorization";
import { dataSourceRepository } from "@/server/repositories/data-sources";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Data sources" };
export default async function DataSourcesPage() {
  const context = await requireAuthorization();
  const sources = await dataSourceRepository.list(context);
  return (
    <div className="space-y-7">
      <PageHeader
        title="Data sources"
        description="Manage tenant-scoped connections and the metadata available to dashboard designers."
        action={
          <Button asChild>
            <Link href="/workspace/data-sources/new">
              <Plus size={18} />
              New data source
            </Link>
          </Button>
        }
      />
      {sources.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sources.map((source) => (
            <Link
              key={source.id}
              href={`/workspace/data-sources/${source.id}`}
              className="rounded-xl focus-visible:outline-none"
            >
              <Card className="h-full transition-colors hover:border-slate-400">
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <Database size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="truncate font-semibold">{source.name}</h2>
                      <StatusBadge status={source.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {source.type} ·{" "}
                      {source.host ||
                        source.file?.originalName ||
                        "Not configured"}
                    </p>
                    <div className="mt-4 flex gap-5 text-xs text-muted-foreground">
                      <span>{source._count.schemas} schemas</span>
                      <span>Updated {formatDate(source.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="grid place-items-center p-12 text-center">
            <Database className="mb-4 text-slate-400" size={34} />
            <h2 className="font-semibold">No data sources yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Use the guided setup to add MySQL or prepare another supported
              source.
            </p>
            <Button asChild className="mt-5">
              <Link href="/workspace/data-sources/new">Open setup wizard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "CONNECTED"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "TESTING"
          ? "warning"
          : "neutral";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
