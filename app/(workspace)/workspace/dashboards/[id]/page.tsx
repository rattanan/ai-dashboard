import { notFound } from "next/navigation";
import { Bot, Clock3, Database, LayoutTemplate } from "lucide-react";
import { requireAuthorization } from "@/server/auth/authorization";
import { dashboardRepository } from "@/server/repositories/dashboards";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAuthorization();
  const dashboard = await dashboardRepository.find(context, id);
  if (!dashboard) notFound();
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dashboard configuration"
        title={dashboard.name}
        description={dashboard.businessObjective || "Objective not completed"}
        action={
          <Badge
            tone={dashboard.status === "ANALYZING" ? "warning" : "neutral"}
          >
            {dashboard.status}
          </Badge>
        }
      />
      {dashboard.status === "ANALYZING" ? (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white">
              <Bot />
            </span>
            <div>
              <h2 className="font-semibold">
                AI analysis is prepared for a later phase
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                This placeholder confirms that the dashboard configuration and
                immutable version were saved. No AI output has been fabricated.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryCard
          icon={<Database />}
          title="Data source"
          value={
            dashboard.dataSources
              .map((item) => item.dataSource.name)
              .join(", ") || "None"
          }
        />
        <SummaryCard
          icon={<LayoutTemplate />}
          title="Layout and style"
          value={`${dashboard.layoutStyle.replaceAll("_", " ")} · ${dashboard.visualTheme}`}
        />
        <SummaryCard
          icon={<Clock3 />}
          title="Latest version"
          value={
            dashboard.versions[0]
              ? `Version ${dashboard.versions[0].version} · ${formatDate(dashboard.versions[0].createdAt)}`
              : "No version saved"
          }
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Business context</CardTitle>
          <CardDescription>
            Context that a later AI analysis provider will receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Context label="Business area" value={dashboard.businessArea} />
          <Context label="Target users" value={dashboard.targetUsers} />
          <Context label="Desired KPIs" value={dashboard.desiredKpis} />
          <Context label="Reporting period" value={dashboard.reportingPeriod} />
          <Context
            label="Business questions"
            value={dashboard.businessQuestions}
          />
          <Context
            label="Important filters"
            value={dashboard.importantFilters}
          />
        </CardContent>
      </Card>
    </div>
  );
}
function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-5">
        <span className="text-primary">{icon}</span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm font-semibold capitalize">
            {value.toLowerCase()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
function Context({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">
        {value || "Not specified"}
      </p>
    </div>
  );
}
