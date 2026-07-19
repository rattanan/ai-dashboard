import { requireAuthorization } from "@/server/auth/authorization";
import { dataSourceRepository } from "@/server/repositories/data-sources";
import { dashboardRepository } from "@/server/repositories/dashboards";
import { SetupWizard } from "@/components/wizard/setup-wizard";
import { PageHeader } from "@/components/ui/page-header";
import {
  hasPermission,
  requireDashboardAccess,
  requireDataSourceAccess,
  requirePermission,
} from "@/server/auth/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Data source setup" };
export default async function NewDataSourcePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const context = await requireAuthorization();
  const id = typeof query.id === "string" ? query.id : undefined;
  const dashboardId =
    typeof query.dashboard === "string" ? query.dashboard : undefined;
  if (dashboardId) {
    if (!id) notFound();
    await requirePermission(context, "dashboard.update");
    await requireDashboardAccess(context, dashboardId, "edit");
    if (!(await hasPermission(context, "role.manage"))) {
      await requireDataSourceAccess(context, id, "build");
    }
  } else if (id) {
    await requirePermission(context, "dashboard.create");
    if (!(await hasPermission(context, "role.manage"))) {
      await requireDataSourceAccess(context, id, "build");
    }
  } else {
    await requirePermission(context, "datasource.create");
  }
  const source = id ? await dataSourceRepository.find(context, id) : null;
  const dashboard = dashboardId
    ? await dashboardRepository.find(context, dashboardId)
    : null;
  if (
    dashboardId &&
    (!source ||
      !dashboard ||
      !dashboard.dataSources.some((item) => item.dataSourceId === source.id))
  ) {
    notFound();
  }
  const serializedSource = source
    ? {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        host: source.host,
        port: source.port,
        databaseName: source.databaseName,
        username: source.username,
        sslEnabled: source.sslEnabled,
        fileName: source.file?.originalName,
        sheetNames: Array.isArray(source.file?.sheetNames)
          ? source.file.sheetNames.map(String)
          : [],
        schemas: source.schemas.map((schema) => ({
          id: schema.id,
          name: schema.name,
          tables: schema.tables.map((table) => ({
            id: table.id,
            name: table.name,
            tableType: table.tableType,
            selected: table.selected,
            estimatedRows: table.estimatedRowCount?.toString() ?? null,
          })),
        })),
      }
    : undefined;
  const serializedDashboard = dashboard
    ? {
        id: dashboard.id,
        name: dashboard.name,
        businessArea: dashboard.businessArea,
        businessObjective: dashboard.businessObjective,
        businessQuestions: dashboard.businessQuestions,
        desiredKpis: dashboard.desiredKpis,
        targetUsers: dashboard.targetUsers,
        reportingPeriod: dashboard.reportingPeriod,
        importantFilters: dashboard.importantFilters,
        layoutStyle: dashboard.layoutStyle,
        visualStyle: dashboard.visualStyle,
        visualTheme: dashboard.visualTheme,
      }
    : undefined;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={
          dashboardId
            ? "Dashboard editor"
            : id
              ? "New dashboard"
              : "Guided setup"
        }
        title={
          dashboardId
            ? "Edit dashboard configuration"
            : id
              ? "Define dashboard business context"
              : "Create a dashboard foundation"
        }
        description={
          dashboardId
            ? "Update the business objective, layout, visual style, and theme."
            : id
              ? "Use the selected governed data source to define the dashboard objective and appearance."
              : "Connect data, select its scope, and save the context required for future AI analysis."
        }
      />
      <SetupWizard
        initialStep={Number(query.step) || 1}
        initialType={
          typeof query.type === "string" ? (query.type as never) : undefined
        }
        source={serializedSource}
        dashboard={serializedDashboard}
        editMode={Boolean(dashboardId)}
      />
    </div>
  );
}
