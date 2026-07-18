import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { requireAuthorization } from "@/server/auth/authorization";
import { dashboardRepository } from "@/server/repositories/dashboards";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Dashboards" };
export default async function DashboardsPage() {
  const context = await requireAuthorization();
  const dashboards = await dashboardRepository.list(context);
  return (
    <div className="space-y-7">
      <PageHeader
        title="Dashboards"
        description="Saved business context, layout choices, versions, and future AI-generated content."
      />
      {dashboards.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboards.map((dashboard) => (
            <Link
              href={`/workspace/dashboards/${dashboard.id}`}
              key={dashboard.id}
            >
              <Card className="h-full hover:border-slate-400">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                      <LayoutDashboard size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2">
                        <h2 className="font-semibold">{dashboard.name}</h2>
                        <Badge
                          tone={
                            dashboard.status === "ANALYZING"
                              ? "warning"
                              : dashboard.status === "PUBLISHED"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {dashboard.status}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {dashboard.businessObjective ||
                          "Objective not completed"}
                      </p>
                      <p className="mt-4 text-xs text-muted-foreground">
                        {dashboard._count.versions} versions · Updated{" "}
                        {formatDate(dashboard.updatedAt)}
                      </p>
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
            <LayoutDashboard className="mb-4 text-slate-400" size={34} />
            <h2 className="font-semibold">No dashboard configurations</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A dashboard draft is created during the data-source setup wizard.
            </p>
            <Button asChild className="mt-5">
              <Link href="/workspace/data-sources/new">Start setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
