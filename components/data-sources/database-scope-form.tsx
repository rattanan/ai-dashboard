"use client";

import { useActionState } from "react";
import {
  enrichDatabaseMetadataAction,
  saveDatabaseScopeAction,
} from "@/features/data-sources/actions";
import { Button } from "@/components/ui/button";

type ActionState =
  | { ok: true; data: unknown }
  | { ok: false; error: { message: string } }
  | null;

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
      className={
        state.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"
      }
    >
      {state.ok ? "Saved successfully." : state.error.message}
    </p>
  );
}

export function DatabaseScopeForm({
  dataSourceId,
  sampleDataEnabled,
  schemas,
}: {
  dataSourceId: string;
  sampleDataEnabled: boolean;
  schemas: Array<{
    id: string;
    name: string;
    tables: Array<{
      id: string;
      name: string;
      tableType: string;
      selected: boolean;
      sampleDataEnabled: boolean;
      semanticDescription: string | null;
      columnCount: number;
    }>;
  }>;
}) {
  const [scopeState, scopeAction, scopePending] = useActionState(
    saveDatabaseScopeAction,
    null,
  );
  const [enrichState, enrichAction, enrichPending] = useActionState(
    enrichDatabaseMetadataAction,
    null,
  );
  return (
    <div className="space-y-6">
      <form action={scopeAction} className="space-y-5">
        <input type="hidden" name="dataSourceId" value={dataSourceId} />
        <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-muted/30 px-3 text-sm font-medium">
          <input
            type="checkbox"
            name="sampleDataEnabled"
            defaultChecked={sampleDataEnabled}
            className="size-4"
          />
          Allow masked sample rows for AI metadata analysis
        </label>
        <p className="text-xs text-muted-foreground">
          Table selection controls query access. Sample rows are disabled by
          default and are always masked by the organization privacy policy
          before AI use.
        </p>
        <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {schemas.map((schema) => (
            <fieldset key={schema.id} className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">
                {schema.name}
              </legend>
              <div className="mt-1 divide-y">
                {schema.tables.map((table) => (
                  <div
                    key={table.id}
                    className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <label className="flex min-h-11 gap-3">
                      <input
                        type="checkbox"
                        name="selectedTableIds"
                        value={table.id}
                        defaultChecked={table.selected}
                        className="mt-1 size-4"
                      />
                      <span>
                        <span className="block break-all text-sm font-medium">
                          {table.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {table.tableType} · {table.columnCount} columns
                        </span>
                        {table.semanticDescription ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {table.semanticDescription}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="sampleTableIds"
                        value={table.id}
                        defaultChecked={table.sampleDataEnabled}
                        className="size-4"
                      />
                      Allow sample
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <Feedback state={scopeState} />
        <Button disabled={scopePending}>
          {scopePending ? "Saving scope…" : "Save governed scope"}
        </Button>
      </form>
      <form action={enrichAction} className="space-y-3 border-t pt-5">
        <input type="hidden" name="dataSourceId" value={dataSourceId} />
        <div>
          <h3 className="text-sm font-semibold">AI semantic metadata</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate versioned descriptions and embeddings only for selected
            metadata.
          </p>
        </div>
        <Feedback state={enrichState} />
        <Button type="submit" variant="outline" disabled={enrichPending}>
          {enrichPending
            ? "Generating… (up to 45 seconds)"
            : "Generate semantic descriptions"}
        </Button>
      </form>
    </div>
  );
}
