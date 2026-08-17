"use client";

import { useActionState, useState } from "react";
import {
  deleteLegacyApiAction,
  saveLegacyApiAction,
  testLegacyApiAction,
} from "@/features/legacy-api/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ActionState =
  | { ok: true; data: unknown }
  | { ok: false; error: { message: string } }
  | null;

type LegacyApiValue = {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  endpointPath: string;
  method: "GET" | "POST";
  readOnlyConfirmed: boolean;
  enabled: boolean;
  allowedDomains: string[];
  timeoutMs: number;
  maxResponseBytes: number;
  maxRedirects: number;
  requestHeadersJson: string;
  parametersJson: string;
  bodyTemplateJson: string;
  responseSchemaJson: string;
  responseMappingJson: string;
  authType: "NONE" | "API_KEY" | "BEARER" | "BASIC" | "CUSTOM_HEADER";
  credentialPresent: boolean;
};

function ActionMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  const data =
    state.ok && state.data && typeof state.data === "object"
      ? (state.data as Record<string, unknown>)
      : null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
      className={
        state.ok
          ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          : "rounded-lg bg-red-50 p-3 text-sm text-red-800"
      }
    >
      <p>{state.ok ? "Operation completed safely." : state.error.message}</p>
      {data && typeof data.summary === "string" ? (
        <p className="mt-2 font-medium">{data.summary}</p>
      ) : null}
      {data && data.preview !== undefined ? (
        <pre className="mt-3 max-h-72 overflow-auto rounded bg-slate-950 p-3 text-xs text-white">
          {JSON.stringify(data.preview, null, 2)}
        </pre>
      ) : null}
      {data && data.citation && typeof data.citation === "object" ? (
        <p className="mt-2 text-xs">
          Citation: {String((data.citation as Record<string, unknown>).apiName)}{" "}
          · {String((data.citation as Record<string, unknown>).calledAt)}
        </p>
      ) : null}
    </div>
  );
}

function JsonArea({
  id,
  name,
  label,
  value,
  rows = 6,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={value}
        spellCheck={false}
        className="w-full rounded-lg border bg-background p-3 font-mono text-xs"
      />
    </Field>
  );
}

export function LegacyApiRegistryForm({ value }: { value?: LegacyApiValue }) {
  const prefix = value?.id ?? "new";
  const [authType, setAuthType] = useState(value?.authType ?? "NONE");
  const [state, action, pending] = useActionState(saveLegacyApiAction, null);
  const [testState, testAction, testing] = useActionState(
    testLegacyApiAction,
    null,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteLegacyApiAction,
    null,
  );
  return (
    <div className="space-y-5">
      <form action={action} className="grid gap-5 lg:grid-cols-2">
        {value ? (
          <>
            <input type="hidden" name="legacyApiId" value={value.id} />
            <input
              type="hidden"
              name="credentialPresent"
              value={String(value.credentialPresent)}
            />
          </>
        ) : null}
        <Field label="API name" htmlFor={`legacy-name-${prefix}`} required>
          <Input
            id={`legacy-name-${prefix}`}
            name="name"
            defaultValue={value?.name}
            required
          />
        </Field>
        <Field label="HTTP method" htmlFor={`legacy-method-${prefix}`}>
          <select
            id={`legacy-method-${prefix}`}
            name="method"
            defaultValue={value?.method ?? "GET"}
            className="min-h-11 w-full rounded-lg border bg-background px-3"
          >
            <option value="GET">GET</option>
            <option value="POST">POST — confirmed read-only only</option>
          </select>
        </Field>
        <div className="lg:col-span-2">
          <Field
            label="Tool description"
            htmlFor={`legacy-description-${prefix}`}
            hint="Describe when the bot should select this tool. Do not include credentials."
            required
          >
            <textarea
              id={`legacy-description-${prefix}`}
              name="description"
              rows={3}
              defaultValue={value?.description}
              className="w-full rounded-lg border bg-background p-3 text-sm"
              required
            />
          </Field>
        </div>
        <Field label="Base URL" htmlFor={`legacy-base-${prefix}`} required>
          <Input
            id={`legacy-base-${prefix}`}
            name="baseUrl"
            type="url"
            placeholder="https://api.example.com"
            defaultValue={value?.baseUrl}
            required
          />
        </Field>
        <Field
          label="Fixed endpoint path"
          htmlFor={`legacy-path-${prefix}`}
          hint="Path placeholders must be declared, for example /customers/{customerId}."
          required
        >
          <Input
            id={`legacy-path-${prefix}`}
            name="endpointPath"
            placeholder="/v1/customers/{customerId}"
            defaultValue={value?.endpointPath ?? "/"}
            required
          />
        </Field>
        <div className="lg:col-span-2">
          <Field
            label="Allowed public domains — one per line"
            htmlFor={`legacy-domains-${prefix}`}
            hint="Every DNS result and redirect is checked against this allowlist and private-address policy."
            required
          >
            <textarea
              id={`legacy-domains-${prefix}`}
              name="allowedDomains"
              rows={3}
              placeholder="api.example.com"
              defaultValue={value?.allowedDomains.join("\n")}
              className="w-full rounded-lg border bg-background p-3 text-sm"
              required
            />
          </Field>
        </div>
        <Field label="Timeout (ms)" htmlFor={`legacy-timeout-${prefix}`}>
          <Input
            id={`legacy-timeout-${prefix}`}
            name="timeoutMs"
            type="number"
            min="1000"
            max="60000"
            defaultValue={value?.timeoutMs ?? 10000}
            required
          />
        </Field>
        <Field
          label="Maximum response bytes"
          htmlFor={`legacy-bytes-${prefix}`}
        >
          <Input
            id={`legacy-bytes-${prefix}`}
            name="maxResponseBytes"
            type="number"
            min="1024"
            max="10485760"
            defaultValue={value?.maxResponseBytes ?? 1048576}
            required
          />
        </Field>
        <Field
          label="Maximum same-origin redirects"
          htmlFor={`legacy-redirects-${prefix}`}
        >
          <Input
            id={`legacy-redirects-${prefix}`}
            name="maxRedirects"
            type="number"
            min="0"
            max="5"
            defaultValue={value?.maxRedirects ?? 0}
            required
          />
        </Field>
        <Field label="Authentication" htmlFor={`legacy-auth-${prefix}`}>
          <select
            id={`legacy-auth-${prefix}`}
            name="authType"
            value={authType}
            onChange={(event) =>
              setAuthType(event.target.value as typeof authType)
            }
            className="min-h-11 w-full rounded-lg border bg-background px-3"
          >
            <option value="NONE">None</option>
            <option value="API_KEY">API key header</option>
            <option value="BEARER">Bearer token</option>
            <option value="BASIC">Basic authentication</option>
            <option value="CUSTOM_HEADER">Encrypted custom header</option>
          </select>
        </Field>
        {authType === "API_KEY" ? (
          <>
            <Field
              label="API key header name"
              htmlFor={`legacy-key-name-${prefix}`}
            >
              <Input
                id={`legacy-key-name-${prefix}`}
                name="apiKeyHeaderName"
                placeholder="X-API-Key"
              />
            </Field>
            <Field
              label="API key"
              htmlFor={`legacy-key-${prefix}`}
              hint="Leave blank to keep the current encrypted value."
            >
              <Input
                id={`legacy-key-${prefix}`}
                name="apiKey"
                type="password"
                autoComplete="new-password"
              />
            </Field>
          </>
        ) : null}
        {authType === "BEARER" ? (
          <Field
            label="Bearer token"
            htmlFor={`legacy-bearer-${prefix}`}
            hint="Leave blank to keep the current encrypted value."
          >
            <Input
              id={`legacy-bearer-${prefix}`}
              name="bearerToken"
              type="password"
              autoComplete="new-password"
            />
          </Field>
        ) : null}
        {authType === "BASIC" ? (
          <>
            <Field label="Basic username" htmlFor={`legacy-user-${prefix}`}>
              <Input
                id={`legacy-user-${prefix}`}
                name="basicUsername"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Basic password"
              htmlFor={`legacy-password-${prefix}`}
              hint="Leave both fields blank to keep the encrypted credential."
            >
              <Input
                id={`legacy-password-${prefix}`}
                name="basicPassword"
                type="password"
                autoComplete="new-password"
              />
            </Field>
          </>
        ) : null}
        {authType === "CUSTOM_HEADER" ? (
          <>
            <Field
              label="Custom header name"
              htmlFor={`legacy-custom-name-${prefix}`}
            >
              <Input
                id={`legacy-custom-name-${prefix}`}
                name="customHeaderName"
              />
            </Field>
            <Field
              label="Custom header value"
              htmlFor={`legacy-custom-value-${prefix}`}
              hint="Leave blank to keep the current encrypted value."
            >
              <Input
                id={`legacy-custom-value-${prefix}`}
                name="customHeaderValue"
                type="password"
                autoComplete="new-password"
              />
            </Field>
          </>
        ) : null}
        <div className="lg:col-span-2">
          <JsonArea
            id={`legacy-headers-${prefix}`}
            name="requestHeadersJson"
            label="Static request headers (JSON)"
            hint="Authentication, host, forwarding, cookies, and line breaks are rejected."
            value={value?.requestHeadersJson ?? "{}"}
          />
        </div>
        <div className="lg:col-span-2">
          <JsonArea
            id={`legacy-parameters-${prefix}`}
            name="parametersJson"
            label="Parameter contract (JSON array)"
            hint="Each item defines name, label, description, location (PATH/QUERY/BODY), type, and required."
            value={value?.parametersJson ?? "[]"}
            rows={9}
          />
        </div>
        <JsonArea
          id={`legacy-body-${prefix}`}
          name="bodyTemplateJson"
          label="Read-only POST body template (JSON)"
          hint="Use {{parameterName}} placeholders. GET must use null."
          value={value?.bodyTemplateJson ?? "null"}
        />
        <JsonArea
          id={`legacy-schema-${prefix}`}
          name="responseSchemaJson"
          label="Response JSON Schema"
          value={value?.responseSchemaJson ?? '{\n  "type": "object"\n}'}
        />
        <div className="lg:col-span-2">
          <JsonArea
            id={`legacy-mapping-${prefix}`}
            name="responseMappingJson"
            label="Response mapping"
            hint='Map output labels to dot paths, for example {"customerName":"data.name"}.'
            value={value?.responseMappingJson ?? "{}"}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm">
          <input
            name="readOnlyConfirmed"
            type="checkbox"
            defaultChecked={value?.readOnlyConfirmed ?? false}
          />
          I confirm this operation is read-only and has no side effects
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={value?.enabled ?? false}
          />
          Enabled for assigned bots and authorized users
        </label>
        <div className="space-y-3 lg:col-span-2">
          <ActionMessage state={state} />
          <Button disabled={pending}>
            {pending
              ? "Saving…"
              : value
                ? "Save API definition"
                : "Register API"}
          </Button>
        </div>
      </form>

      {value ? (
        <div className="grid gap-4 border-t pt-5 lg:grid-cols-[1fr_auto]">
          <form action={testAction} className="space-y-3">
            <input type="hidden" name="id" value={value.id} />
            <JsonArea
              id={`legacy-test-${prefix}`}
              name="parametersJson"
              label="Test API parameters"
              hint="Only declared scalar parameters are accepted; secrets remain server-side."
              value="{}"
              rows={4}
            />
            <ActionMessage state={testState} />
            <Button type="submit" variant="secondary" disabled={testing}>
              {testing ? "Testing safely…" : "Test API"}
            </Button>
          </form>
          <form
            action={deleteAction}
            className="self-end"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete ${value.name} and its invocation history?`,
                )
              )
                event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={value.id} />
            <ActionMessage state={deleteState} />
            <button
              type="submit"
              disabled={deleting}
              className="mt-3 min-h-11 rounded-lg border border-red-200 px-4 text-sm text-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete API"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
