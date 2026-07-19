import { notFound } from "next/navigation";
import { Columns3, Database, KeyRound, Table2 } from "lucide-react";
import { requireAuthorization } from "@/server/auth/authorization";
import { dataSourceRepository } from "@/server/repositories/data-sources";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "../page";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ServerOperationButton } from "@/components/wizard/server-operation-button";
import { DeleteDataSourceDialog } from "@/components/data-sources/delete-data-source-dialog";
import { hasPermission } from "@/server/auth/permissions";

export default async function DataSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAuthorization();
  const source = await dataSourceRepository.find(context, id);
  if (!source) notFound();
  const canManage = await hasPermission(context, "datasource.update");
  const canDelete = await hasPermission(context, "datasource.delete");
  const tableCount = source.schemas.reduce(
    (sum, schema) => sum + schema.tables.length,
    0,
  );
  const columnCount = source.schemas.reduce(
    (sum, schema) =>
      sum + schema.tables.reduce((n, table) => n + table.columns.length, 0),
    0,
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={source.type}
        title={source.name}
        description="Credentials remain encrypted and are never returned by this page."
        action={<StatusBadge status={source.status} />}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Connection</CardTitle>
                <CardDescription>
                  Sanitized server-side configuration.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Info label="Host" value={source.host || "—"} />
                <Info label="Port" value={source.port?.toString() || "—"} />
                <Info label="Database" value={source.databaseName || "—"} />
                <Info label="Username" value={source.username || "—"} />
                <Info
                  label="TLS"
                  value={source.sslEnabled ? "Enabled" : "Disabled"}
                />
                <Info
                  label="Credential"
                  value={
                    source.credential ? "Encrypted and stored" : "Not stored"
                  }
                />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Discovered metadata</CardTitle>
              <CardDescription>
                {source.lastDiscoveredAt
                  ? `Last discovered ${formatDate(source.lastDiscoveredAt)}`
                  : "Metadata has not been discovered."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {source.schemas.length ? (
                <div className="space-y-3">
                  {source.schemas.map((schema) => (
                    <details key={schema.id} className="rounded-lg border">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 font-medium">
                        <span>{schema.name}</span>
                        <Badge>{schema.tables.length} objects</Badge>
                      </summary>
                      <div className="border-t p-3">
                        {schema.tables.map((table) => (
                          <div
                            key={table.id}
                            className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
                          >
                            <span className="flex items-center gap-2">
                              <Table2
                                size={16}
                                className="text-muted-foreground"
                              />
                              {table.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {table.columns.length} columns
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run metadata discovery after a successful MySQL connection
                  test.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Connection actions</CardTitle>
              <CardDescription>Executed only on the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ServerOperationButton endpoint={`/api/data-sources/${id}/test`}>
                Test connection
              </ServerOperationButton>
              <ServerOperationButton
                endpoint={`/api/data-sources/${id}/discover`}
              >
                Discover metadata
              </ServerOperationButton>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <Summary
                icon={<Database />}
                label="Schemas"
                value={source.schemas.length}
              />
              <Summary
                icon={<Table2 />}
                label="Tables and views"
                value={tableCount}
              />
              <Summary
                icon={<Columns3 />}
                label="Columns"
                value={columnCount}
              />
              <Summary
                icon={<KeyRound />}
                label="Credential exposed"
                value="No"
              />
            </CardContent>
          </Card>
          {canDelete ? (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-destructive">Danger zone</CardTitle>
                <CardDescription>
                  Permanently remove this connection and all discovered
                  metadata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteDataSourceDialog
                  dataSourceId={source.id}
                  dataSourceName={source.name}
                  linkedDashboards={source.dashboards.length}
                />
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium">{value}</dd>
    </div>
  );
}
function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <strong className="text-sm tabular-nums">{value}</strong>
    </div>
  );
}
