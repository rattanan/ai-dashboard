import Link from "next/link";
import {
  ArrowRight,
  Database,
  LayoutDashboard,
  Plus,
  Sparkles,
} from "lucide-react";
import { requireAuthorization } from "@/server/auth/authorization";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function WorkspacePage() {
  const context = await requireAuthorization();
  const [workspace, dataSources, dashboards, analyses] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: context.workspaceId },
      include: { organization: true },
    }),
    db.dataSource.count({ where: { workspaceId: context.workspaceId } }),
    db.dashboard.count({ where: { workspaceId: context.workspaceId } }),
    db.analysisJob.count({ where: { workspaceId: context.workspaceId } }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={workspace.organization.name}
        title={`Welcome to ${workspace.name}`}
        description="Connect governed data and define the business context for your first AI-assisted dashboard."
        action={
          <Button asChild>
            <Link href="/workspace/data-sources/new">
              <Plus size={18} />
              New data source
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric icon={<Database />} label="Data sources" value={dataSources} />
        <Metric
          icon={<LayoutDashboard />}
          label="Dashboards"
          value={dashboards}
        />
        <Metric
          icon={<Sparkles />}
          label="AI analyses"
          value={analyses}
          note="Persistent governed jobs"
        />
      </div>
      {dataSources === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Database />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">
                Connect your first business data source
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The guided setup validates credentials server-side, discovers
                metadata, and captures your dashboard objective.
              </p>
            </div>
            <Button asChild>
              <Link href="/workspace/data-sources/new">
                Open setup wizard <ArrowRight size={17} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Data foundation</CardTitle>
              <CardDescription>
                Review connection health and discovered metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/workspace/data-sources">View data sources</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dashboard configurations</CardTitle>
              <CardDescription>
                Review drafts and analysis placeholders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/workspace/dashboards">View dashboards</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-11 place-items-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {note ? (
            <p className="text-xs text-muted-foreground">{note}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
