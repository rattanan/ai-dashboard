import { requireAuthorization } from "@/server/auth/authorization";
import { dataSourceRepository } from "@/server/repositories/data-sources";
import { dashboardRepository } from "@/server/repositories/dashboards";
import { SetupWizard } from "@/components/wizard/setup-wizard";
import { PageHeader } from "@/components/ui/page-header";

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
  const source = id ? await dataSourceRepository.find(context, id) : null;
  const dashboard = dashboardId
    ? await dashboardRepository.find(context, dashboardId)
    : null;
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
        eyebrow="Guided setup"
        title="Create a dashboard foundation"
        description="Connect data, select its scope, and save the context required for future AI analysis."
      />
      <SetupWizard
        initialStep={Number(query.step) || 1}
        initialType={
          typeof query.type === "string" ? (query.type as never) : undefined
        }
        source={serializedSource}
        dashboard={serializedDashboard}
      />
    </div>
  );
}
