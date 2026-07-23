"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Network,
  Server,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ServerOperationButton } from "./server-operation-button";
import {
  createDatabaseDataSourceAction,
  saveAppearanceAction,
  saveDataScopeAction,
  saveObjectiveAction,
  startAnalysisAction,
} from "@/features/data-sources/actions";

type SourceType = "MYSQL" | "POSTGRESQL" | "MSSQL" | "ORACLE" | "EXCEL";
type WizardSource = {
  id: string;
  name: string;
  type: SourceType;
  status: string;
  host?: string | null;
  port?: number | null;
  databaseName?: string | null;
  username?: string | null;
  sslEnabled: boolean;
  fileName?: string;
  sheetNames?: string[];
  schemas: {
    id: string;
    name: string;
    tables: {
      id: string;
      name: string;
      tableType: string;
      selected: boolean;
      estimatedRows: string | null;
    }[];
  }[];
};
type WizardDashboard = {
  id: string;
  name: string;
  businessArea: string | null;
  businessObjective: string | null;
  businessQuestions: string | null;
  desiredKpis: string | null;
  targetUsers: string | null;
  reportingPeriod: string | null;
  importantFilters: string | null;
  layoutStyle: string;
  visualStyle: string;
  visualTheme: string;
};

const steps = [
  "Welcome",
  "Source",
  "Details",
  "Test",
  "Scope",
  "Objective",
  "Appearance",
  "Review",
];
const sourceOptions: {
  type: SourceType;
  title: string;
  description: string;
  live: boolean;
  icon: React.ReactNode;
}[] = [
  {
    type: "MYSQL",
    title: "MySQL",
    description: "Live connection testing and metadata discovery.",
    live: true,
    icon: <Database />,
  },
  {
    type: "POSTGRESQL",
    title: "PostgreSQL",
    description: "Adapter prepared; live support follows Phase 0.",
    live: false,
    icon: <Server />,
  },
  {
    type: "MSSQL",
    title: "Microsoft SQL Server",
    description: "Adapter prepared; live support follows Phase 0.",
    live: false,
    icon: <Network />,
  },
  {
    type: "ORACLE",
    title: "Oracle Database",
    description: "Read-only Thin mode connection, discovery, and previews.",
    live: true,
    icon: <Gauge />,
  },
  {
    type: "EXCEL",
    title: "Excel workbook",
    description: "Upload and detect workbook sheets.",
    live: true,
    icon: <FileSpreadsheet />,
  },
];
const defaultPorts: Record<Exclude<SourceType, "EXCEL">, number> = {
  MYSQL: 3306,
  POSTGRESQL: 5432,
  MSSQL: 1433,
  ORACLE: 1521,
};

export function SetupWizard({
  initialStep,
  initialType,
  source,
  dashboard,
  editMode = false,
}: {
  initialStep: number;
  initialType?: SourceType;
  source?: WizardSource;
  dashboard?: WizardDashboard;
  editMode?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [selectedType, setSelectedType] = useState<SourceType>(
    source?.type ?? initialType ?? "MYSQL",
  );
  const [oracleConnectionType, setOracleConnectionType] = useState<
    "service_name" | "sid"
  >("service_name");
  const [selectedTables, setSelectedTables] = useState(
    () =>
      new Set(
        source?.schemas.flatMap((schema) =>
          schema.tables
            .filter((table) => table.selected)
            .map((table) => table.id),
        ) ?? [],
      ),
  );
  const connectionForm = useRef<HTMLFormElement>(null);
  const step = Math.min(Math.max(initialStep, 1), 8);
  const query = useMemo(
    () => ({ id: source?.id, dashboard: dashboard?.id, type: selectedType }),
    [source?.id, dashboard?.id, selectedType],
  );
  function go(next: number, overrides?: Record<string, string | undefined>) {
    const params = new URLSearchParams({
      step: String(next),
      type: selectedType,
    });
    const merged = { ...query, ...overrides };
    if (merged.id) params.set("id", merged.id);
    if (merged.dashboard) params.set("dashboard", merged.dashboard);
    router.push(`/workspace/data-sources/new?${params}`);
  }
  function run(task: () => Promise<void>) {
    setMessage(undefined);
    startTransition(
      () =>
        void task().catch(() =>
          setMessage("The operation could not be completed. Try again."),
        ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Step {step} of 8</span>
          <span>{steps[step - 1]}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={8}
          aria-valuenow={step}
          aria-label={`Step ${step} of 8`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${step * 12.5}%` }}
          />
        </div>
        <ol className="mt-4 hidden grid-cols-8 gap-2 lg:grid">
          {steps.map((label, index) => (
            <li
              key={label}
              className={`text-center text-xs ${index + 1 === step ? "font-semibold text-primary" : index + 1 < step ? "text-slate-700" : "text-slate-400"}`}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>
      {step === 1 ? (
        <StepCard
          icon={<Sparkles />}
          title="Create an AI-ready dashboard foundation"
          description="This guided setup securely connects your data, discovers its structure, and captures the business objective for a future AI analysis."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Trust
              icon={<LockKeyhole />}
              title="Credentials encrypted"
              text="Secrets stay on the server."
            />
            <Trust
              icon={<Table2 />}
              title="Metadata scoped"
              text="Choose only relevant data."
            />
            <Trust
              icon={<LayoutDashboard />}
              title="Configuration versioned"
              text="Review before analysis."
            />
          </div>
          <Footer onNext={() => go(2)} />
        </StepCard>
      ) : null}
      {step === 2 ? (
        <StepCard
          icon={<Database />}
          title="Select a data source"
          description="Live database connections use encrypted server-side credentials and read-only access."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sourceOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setSelectedType(option.type)}
                aria-pressed={selectedType === option.type}
                className={`min-h-44 cursor-pointer rounded-xl border p-5 text-left transition-colors ${selectedType === option.type ? "border-primary bg-blue-50 ring-2 ring-blue-100" : "bg-card hover:border-slate-400"}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid size-11 place-items-center rounded-lg ${selectedType === option.type ? "bg-primary text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    {option.icon}
                  </span>
                  {selectedType === option.type ? (
                    <CheckCircle2 className="text-primary" size={20} />
                  ) : null}
                </div>
                <h3 className="mt-4 font-semibold">{option.title}</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {option.description}
                </p>
                <Badge
                  className="mt-3"
                  tone={option.live ? "success" : "neutral"}
                >
                  {option.live ? "Phase 0 available" : "Prepared"}
                </Badge>
              </button>
            ))}
          </div>
          <Footer onBack={() => go(1)} onNext={() => go(3)} />
        </StepCard>
      ) : null}
      {step === 3 ? (
        <StepCard
          icon={selectedType === "EXCEL" ? <FileSpreadsheet /> : <Server />}
          title={
            selectedType === "EXCEL"
              ? "Upload an Excel workbook"
              : "Enter connection details"
          }
          description={
            selectedType === "EXCEL"
              ? "The workbook is parsed server-side and stored through the configured storage adapter."
              : "The password is encrypted immediately and is never returned to this browser."
          }
        >
          {selectedType === "EXCEL" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                run(async () => {
                  const response = await fetch(
                    "/api/data-sources/excel-upload",
                    { method: "POST", body: new FormData(form) },
                  );
                  const result = await response.json();
                  if (!result.ok) return setMessage(result.error.message);
                  form.reset();
                  go(4, { id: result.data.id });
                });
              }}
              className="space-y-5"
            >
              <Field label="Connection name" htmlFor="excel-name" required>
                <Input
                  id="excel-name"
                  name="name"
                  placeholder="Monthly finance workbook"
                  required
                />
              </Field>
              <Field
                label="Workbook"
                htmlFor="file"
                required
                hint=".xlsx or .xls, up to the configured upload limit."
              >
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".xlsx,.xls"
                  required
                  className="file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:font-medium file:text-secondary-foreground"
                />
              </Field>
              <Button disabled={pending}>
                {pending ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : null}
                Upload workbook
              </Button>
            </form>
          ) : (
            <form
              ref={connectionForm}
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = new FormData(form);
                let options = {};
                try {
                  options = JSON.parse(
                    String(values.get("connectionOptions") || "{}"),
                  );
                } catch {
                  return setMessage(
                    "Advanced connection parameters must be valid JSON.",
                  );
                }
                run(async () => {
                  const result = await createDatabaseDataSourceAction({
                    type: selectedType,
                    name: values.get("name"),
                    host: values.get("host"),
                    port: values.get("port"),
                    databaseName: values.get("databaseName") || undefined,
                    username: values.get("username"),
                    password: values.get("password"),
                    sslEnabled: values.get("sslEnabled") === "on",
                    connectionOptions: options,
                    connectionType: values.get("connectionType"),
                    serviceName: values.get("serviceName") || undefined,
                    sid: values.get("sid") || undefined,
                    schema: values.get("schema") || undefined,
                    sslMode: values.get("sslMode"),
                    connectionTimeoutMs: values.get("connectionTimeoutMs"),
                  });
                  if (!result.ok) return setMessage(result.error.message);
                  form.reset();
                  go(4, { id: result.data.id });
                });
              }}
              className="grid gap-5 sm:grid-cols-2"
            >
              <Field
                label="Connection name"
                htmlFor="name"
                required
                className="sm:col-span-2"
              >
                <Input
                  id="name"
                  name="name"
                  placeholder="Production reporting"
                  defaultValue={source?.name}
                  required
                />
              </Field>
              <Field label="Host" htmlFor="host" required>
                <Input
                  id="host"
                  name="host"
                  placeholder="db.example.internal"
                  defaultValue={source?.host ?? ""}
                  required
                />
              </Field>
              <Field label="Port" htmlFor="port" required>
                <Input
                  id="port"
                  name="port"
                  type="number"
                  min={1}
                  max={65535}
                  defaultValue={
                    source?.port ??
                    defaultPorts[selectedType as Exclude<SourceType, "EXCEL">]
                  }
                  required
                />
              </Field>
              {selectedType === "ORACLE" ? (
                <>
                  <Field label="Connection type" htmlFor="connectionType">
                    <select
                      id="connectionType"
                      name="connectionType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={oracleConnectionType}
                      onChange={(event) =>
                        setOracleConnectionType(
                          event.target.value as "service_name" | "sid",
                        )
                      }
                    >
                      <option value="service_name">Service Name</option>
                      <option value="sid">SID</option>
                    </select>
                  </Field>
                  {oracleConnectionType === "service_name" ? (
                    <Field label="Service Name" htmlFor="serviceName" required>
                      <Input
                        id="serviceName"
                        name="serviceName"
                        placeholder="ORCLPDB1"
                        defaultValue={source?.databaseName ?? ""}
                        required
                      />
                    </Field>
                  ) : (
                    <Field label="SID" htmlFor="sid" required>
                      <Input id="sid" name="sid" placeholder="ORCL" required />
                    </Field>
                  )}
                  <Field
                    label="Default schema"
                    htmlFor="schema"
                    hint="Optional; defaults to the connected user."
                  >
                    <Input id="schema" name="schema" placeholder="REPORTING" />
                  </Field>
                  <Field label="SSL/TLS mode" htmlFor="sslMode">
                    <select
                      id="sslMode"
                      name="sslMode"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue="disable"
                    >
                      <option value="disable">Disable</option>
                      <option value="prefer">Prefer</option>
                      <option value="require">Require</option>
                    </select>
                  </Field>
                  <Field
                    label="Connection timeout (ms)"
                    htmlFor="connectionTimeoutMs"
                  >
                    <Input
                      id="connectionTimeoutMs"
                      name="connectionTimeoutMs"
                      type="number"
                      min={1000}
                      max={60000}
                      defaultValue={15000}
                    />
                  </Field>
                </>
              ) : (
                <Field label="Database name" htmlFor="databaseName" required>
                  <Input
                    id="databaseName"
                    name="databaseName"
                    defaultValue={source?.databaseName ?? ""}
                    required
                  />
                </Field>
              )}
              <Field label="Username" htmlFor="username" required>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  defaultValue={source?.username ?? ""}
                  required
                />
              </Field>
              <Field
                label="Password"
                htmlFor="password"
                required
                hint="Cleared from the form immediately after saving."
              >
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="sslEnabled"
                  name="sslEnabled"
                  type="checkbox"
                  className="size-5 accent-primary"
                  defaultChecked={source?.sslEnabled}
                />
                <label htmlFor="sslEnabled" className="text-sm font-medium">
                  Use TLS/SSL
                </label>
              </div>
              <details className="sm:col-span-2 rounded-lg border">
                <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium">
                  Advanced connection parameters
                </summary>
                <div className="border-t p-4">
                  <Field
                    label="Parameters as JSON"
                    htmlFor="connectionOptions"
                    hint='Example: {"timezone":"Z"}'
                  >
                    <Textarea
                      id="connectionOptions"
                      name="connectionOptions"
                      className="font-mono text-xs"
                      defaultValue="{}"
                    />
                  </Field>
                </div>
              </details>
              {selectedType === "ORACLE" ? (
                <p className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Use a dedicated Oracle read-only account with SELECT
                  permissions only on approved schemas, tables, or views.
                </p>
              ) : null}
              {selectedType === "ORACLE" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    const form = connectionForm.current;
                    if (!form || !form.reportValidity()) return;
                    const values = new FormData(form);
                    run(async () => {
                      const response = await fetch("/api/data-sources/test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "ORACLE",
                          config: Object.fromEntries(values),
                        }),
                      });
                      const result = await response.json();
                      setMessage(
                        result.ok
                          ? `Connection successful (${result.data.latencyMs} ms; schema ${result.data.currentSchema || "default"}).`
                          : result.error.message,
                      );
                    });
                  }}
                >
                  Test connection
                </Button>
              ) : null}
              <Button disabled={pending} className="sm:col-span-2 sm:w-fit">
                {pending ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : null}
                Encrypt and save
              </Button>
            </form>
          )}
          {message ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}
          <Footer onBack={() => go(2)} />
        </StepCard>
      ) : null}
      {step === 4 && source ? (
        <StepCard
          icon={<Network />}
          title={
            source.type === "EXCEL" ? "Workbook ready" : "Test the connection"
          }
          description={
            source.type === "MYSQL" || source.type === "ORACLE"
              ? "A short-lived server connection will verify these credentials. No raw error or secret is returned."
              : source.type === "EXCEL"
                ? "The workbook was stored and its sheet names were detected."
                : "This adapter is intentionally not connected in Phase 0."
          }
        >
          <ConnectionSummary source={source} />
          {source.type === "MYSQL" || source.type === "ORACLE" ? (
            <ServerOperationButton
              endpoint={`/api/data-sources/${source.id}/test`}
            >
              Test connection
            </ServerOperationButton>
          ) : source.type === "EXCEL" ? (
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 size={18} />
              {source.sheetNames?.length ?? 0} sheets detected
            </p>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {source.type} connectivity is planned for a later phase. The data
              source remains a draft and no success is simulated.
            </div>
          )}
          <Footer
            onBack={() => go(3)}
            onNext={() => go(5)}
            nextDisabled={
              (source.type === "MYSQL" || source.type === "ORACLE") &&
              source.status !== "CONNECTED"
            }
            nextLabel={
              source.type !== "MYSQL" && source.type !== "ORACLE"
                ? "Continue with prepared integration"
                : undefined
            }
          />
        </StepCard>
      ) : null}
      {step === 5 && source ? (
        <StepCard
          icon={<Table2 />}
          title="Select data scope"
          description="Choose the tables and views relevant to this dashboard. Discovery reads only the database metadata views."
        >
          {source.type === "MYSQL" || source.type === "ORACLE" ? (
            <>
              {source.schemas.length ? (
                <div className="space-y-3">
                  {source.schemas.map((schema) => (
                    <details key={schema.id} open className="rounded-lg border">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
                        <span>{schema.name}</span>
                        <Badge>{schema.tables.length} objects</Badge>
                      </summary>
                      <div className="divide-y border-t">
                        {schema.tables.map((table) => (
                          <label
                            key={table.id}
                            className="flex min-h-12 cursor-pointer items-center gap-3 px-4 hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              className="size-5 accent-primary"
                              checked={selectedTables.has(table.id)}
                              onChange={(event) =>
                                setSelectedTables((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(table.id);
                                  else next.delete(table.id);
                                  return next;
                                })
                              }
                            />
                            <span className="flex-1 text-sm font-medium">
                              {table.name}
                            </span>
                            <Badge>{table.tableType}</Badge>
                            <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                              {table.estimatedRows
                                ? `${Number(table.estimatedRows).toLocaleString()} est. rows`
                                : "Rows unknown"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6">
                  <p className="text-sm text-muted-foreground">
                    Discover metadata before selecting tables.
                  </p>
                  <div className="mt-4">
                    <ServerOperationButton
                      endpoint={`/api/data-sources/${source.id}/discover`}
                    >
                      Discover metadata
                    </ServerOperationButton>
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="mt-5"
                disabled={pending || !source.schemas.length}
                onClick={() =>
                  run(async () => {
                    const result = await saveDataScopeAction(source.id, [
                      ...selectedTables,
                    ]);
                    if (!result.ok) return setMessage(result.error.message);
                    go(6);
                  })
                }
              >
                {pending ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Check size={17} />
                )}
                Save selected scope
              </Button>
            </>
          ) : source.type === "EXCEL" ? (
            <div className="space-y-2">
              {source.sheetNames?.map((sheet) => (
                <div
                  key={sheet}
                  className="flex min-h-11 items-center gap-3 rounded-lg border px-4"
                >
                  <FileSpreadsheet size={17} className="text-success" />
                  <span className="text-sm font-medium">{sheet}</span>
                  <Badge tone="success" className="ml-auto">
                    Detected
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Metadata discovery is unavailable for this prepared connector.
            </div>
          )}
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : null}
          <Footer
            onBack={() => go(4)}
            onNext={
              source.type === "MYSQL" || source.type === "ORACLE"
                ? undefined
                : () => go(6)
            }
          />
        </StepCard>
      ) : null}
      {step === 6 && source ? (
        <StepCard
          icon={<Sparkles />}
          title="Describe the dashboard objective"
          description="Give the future AI analysis clear business context and questions to answer."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              run(async () => {
                const result = await saveObjectiveAction({
                  ...values,
                  dataSourceId: source.id,
                  dashboardId: dashboard?.id,
                });
                if (!result.ok) return setMessage(result.error.message);
                go(7, { dashboard: result.data.dashboardId });
              });
            }}
            className="grid gap-5 sm:grid-cols-2"
          >
            <Field label="Dashboard name" htmlFor="dashboard-name" required>
              <Input
                id="dashboard-name"
                name="name"
                defaultValue={dashboard?.name ?? ""}
                placeholder="Revenue operations overview"
                required
              />
            </Field>
            <Field label="Business area" htmlFor="businessArea" required>
              <Input
                id="businessArea"
                name="businessArea"
                defaultValue={dashboard?.businessArea ?? ""}
                placeholder="Sales operations"
                required
              />
            </Field>
            <Field
              label="Business objective"
              htmlFor="businessObjective"
              required
              className="sm:col-span-2"
              hint="Example: Monitor sales pipeline and revenue forecast."
            >
              <Textarea
                id="businessObjective"
                name="businessObjective"
                defaultValue={dashboard?.businessObjective ?? ""}
                minLength={20}
                required
              />
            </Field>
            <Field label="Business questions" htmlFor="businessQuestions">
              <Textarea
                id="businessQuestions"
                name="businessQuestions"
                defaultValue={dashboard?.businessQuestions ?? ""}
                placeholder="Where is pipeline coverage at risk?"
              />
            </Field>
            <Field label="Desired KPIs" htmlFor="desiredKpis">
              <Textarea
                id="desiredKpis"
                name="desiredKpis"
                defaultValue={dashboard?.desiredKpis ?? ""}
                placeholder="Bookings, win rate, forecast accuracy"
              />
            </Field>
            <Field label="Target users" htmlFor="targetUsers">
              <Input
                id="targetUsers"
                name="targetUsers"
                defaultValue={dashboard?.targetUsers ?? ""}
                placeholder="VP Sales and regional managers"
              />
            </Field>
            <Field label="Reporting period" htmlFor="reportingPeriod">
              <Input
                id="reportingPeriod"
                name="reportingPeriod"
                defaultValue={dashboard?.reportingPeriod ?? ""}
                placeholder="Current quarter, weekly refresh"
              />
            </Field>
            <Field
              label="Important filters"
              htmlFor="importantFilters"
              className="sm:col-span-2"
            >
              <Input
                id="importantFilters"
                name="importantFilters"
                defaultValue={dashboard?.importantFilters ?? ""}
                placeholder="Region, segment, owner, product"
              />
            </Field>
            <Button className="sm:col-span-2 sm:w-fit" disabled={pending}>
              {pending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : null}
              Save objective
            </Button>
          </form>
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : null}
          <Footer
            onBack={() =>
              editMode && dashboard
                ? router.push(`/workspace/dashboards/${dashboard.id}`)
                : go(5)
            }
          />
        </StepCard>
      ) : null}
      {step === 7 && dashboard ? (
        <StepCard
          icon={<LayoutDashboard />}
          title="Choose layout and visual direction"
          description="These choices configure the dashboard shell. No charts are generated in Phase 0."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              run(async () => {
                const result = await saveAppearanceAction({
                  ...values,
                  dashboardId: dashboard.id,
                });
                if (!result.ok) return setMessage(result.error.message);
                go(8);
              });
            }}
            className="space-y-6"
          >
            <ChoiceGroup
              name="layoutStyle"
              label="Layout"
              defaultValue={dashboard.layoutStyle}
              options={[
                "EXECUTIVE_OVERVIEW",
                "OPERATIONAL_MONITORING",
                "ANALYTICAL_EXPLORER",
                "CONTROL_CENTER",
                "CUSTOM",
              ]}
            />
            <ChoiceGroup
              name="visualStyle"
              label="Visual style"
              defaultValue={dashboard.visualStyle}
              options={[
                "CLEAN_PROFESSIONAL",
                "MODERN_ENTERPRISE",
                "MINIMAL_LIGHT",
                "DARK_CONTROL_ROOM",
                "DATA_DENSE",
              ]}
            />
            <ChoiceGroup
              name="visualTheme"
              label="Theme"
              defaultValue={dashboard.visualTheme}
              options={["BLUE", "EMERALD", "AMBER", "SLATE", "CUSTOM"]}
              themes
            />
            <Button disabled={pending}>
              {pending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : null}
              Save appearance
            </Button>
          </form>
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : null}
          <Footer onBack={() => go(6)} />
        </StepCard>
      ) : null}
      {step === 8 && source && dashboard ? (
        <StepCard
          icon={<CheckCircle2 />}
          title="Review your configuration"
          description="Confirm the governed data source and business context before creating the analysis placeholder."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Review
              label="Data source"
              value={`${source.name} · ${source.type}`}
            />
            <Review label="Connection" value={source.status} />
            <Review
              label="Selected tables"
              value={
                source.type === "MYSQL" || source.type === "ORACLE"
                  ? `${source.schemas.flatMap((s) => s.tables).filter((t) => t.selected).length} selected`
                  : `${source.sheetNames?.length ?? 0} sheets detected`
              }
            />
            <Review label="Dashboard" value={dashboard.name} />
            <Review
              label="Objective"
              value={dashboard.businessObjective || "Not specified"}
              wide
            />
            <Review
              label="Layout"
              value={dashboard.layoutStyle.replaceAll("_", " ")}
            />
            <Review
              label="Style and theme"
              value={`${dashboard.visualStyle.replaceAll("_", " ")} · ${dashboard.visualTheme}`}
            />
          </div>
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Starting analysis creates a persistent job and changes the dashboard
            status to <strong>ANALYZING</strong>. Each bounded stage is saved so
            failed work can be reviewed and safely retried.
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => go(7)}>
              <ArrowLeft size={17} />
              Back
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await startAnalysisAction(dashboard.id);
                  if (result && !result.ok) setMessage(result.error.message);
                })
              }
            >
              {pending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              Start AI Analysis
            </Button>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : null}
        </StepCard>
      ) : null}
      {step > 3 && !source ? (
        <MissingState
          go={() => go(2)}
          label="The setup link is missing its data source. Select a source to continue."
        />
      ) : null}
      {step > 6 && !dashboard ? (
        <MissingState
          go={() => go(6)}
          label="The setup link is missing its dashboard draft. Complete the objective to continue."
        />
      ) : null}
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b p-6">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            {icon}
          </span>
          <div>
            <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}
function Footer({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-7 flex justify-between border-t pt-5">
      {onBack ? (
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={17} />
          Back
        </Button>
      ) : (
        <span />
      )}
      {onNext ? (
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel || "Continue"}
          <ArrowRight size={17} />
        </Button>
      ) : null}
    </div>
  );
}
function Trust({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <span className="text-primary">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
function ConnectionSummary({ source }: { source: WizardSource }) {
  return (
    <div className="mb-6 grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2">
      <Review label="Connection" value={source.name} />
      <Review label="Type" value={source.type} />
      <Review
        label={source.type === "EXCEL" ? "File" : "Host"}
        value={source.fileName || source.host || "—"}
      />
      <Review label="Status" value={source.status} />
    </div>
  );
}
function Review({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-slate-50 p-4 ${wide ? "sm:col-span-2" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold capitalize">
        {value.toLowerCase()}
      </p>
    </div>
  );
}
function ChoiceGroup({
  name,
  label,
  options,
  defaultValue,
  themes,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue: string;
  themes?: boolean;
}) {
  const colors: Record<string, string> = {
    BLUE: "bg-blue-700",
    EMERALD: "bg-emerald-700",
    AMBER: "bg-amber-600",
    SLATE: "bg-slate-700",
    CUSTOM: "bg-white border",
  };
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-blue-50"
          >
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={option === defaultValue}
              className="size-4 accent-primary"
              required
            />
            {themes ? (
              <span className={`size-5 rounded-full ${colors[option]}`} />
            ) : null}
            <span className="text-sm font-medium capitalize">
              {option.replaceAll("_", " ").toLowerCase()}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function MissingState({ go, label }: { go: () => void; label: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Button className="mt-5" onClick={go}>
          Return to setup
        </Button>
      </CardContent>
    </Card>
  );
}
