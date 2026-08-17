"use client";

import { useActionState } from "react";
import {
  createSharedFolderSourceAction,
  createWebSourceAction,
} from "@/features/knowledge/source-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type RackChoice = { id: string; name: string };
type ActionState =
  | { ok: true; data: unknown }
  | { ok: false; error: { message: string } }
  | null;

function ActionMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  const warning =
    state.ok &&
    typeof state.data === "object" &&
    state.data !== null &&
    "scheduleWarning" in state.data &&
    typeof state.data.scheduleWarning === "string"
      ? state.data.scheduleWarning
      : null;
  return (
    <p
      aria-live="polite"
      className={
        state.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"
      }
    >
      {state.ok
        ? (warning ?? "Source created. You can start its first refresh below.")
        : state.error.message}
    </p>
  );
}

function ScheduleFields({
  prefix,
  defaultMinutes,
}: {
  prefix: string;
  defaultMinutes: number;
}) {
  return (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input name="scheduleEnabled" type="checkbox" />
        Refresh automatically
      </label>
      <Field label="Refresh interval (minutes)" htmlFor={`${prefix}-interval`}>
        <Input
          id={`${prefix}-interval`}
          name="intervalMinutes"
          type="number"
          min="5"
          max="10080"
          defaultValue={defaultMinutes}
          required
        />
      </Field>
    </>
  );
}

function RackSelect({ id, racks }: { id: string; racks: RackChoice[] }) {
  return (
    <Field label="Knowledge rack" htmlFor={id} required>
      <select
        id={id}
        name="rackId"
        className="min-h-11 w-full rounded-lg border bg-background px-3"
        required
      >
        <option value="">Select a rack</option>
        {racks.map((rack) => (
          <option key={rack.id} value={rack.id}>
            {rack.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SharedFolderSourceForm({
  racks,
  allowedRoots,
}: {
  racks: RackChoice[];
  allowedRoots: string[];
}) {
  const [state, action, pending] = useActionState(
    createSharedFolderSourceAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <RackSelect id="folder-rack" racks={racks} />
      <Field label="Source name" htmlFor="folder-name" required>
        <Input
          id="folder-name"
          name="name"
          placeholder="Team policies folder"
          required
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Pre-mounted folder path" htmlFor="folder-path" required>
          <Input
            id="folder-path"
            name="rootPath"
            placeholder={`${allowedRoots[0] ?? "/mnt/insightkm-knowledge"}/policies`}
            required
          />
        </Field>
        <p className="mt-1 text-xs text-muted-foreground">
          Allowed root{allowedRoots.length === 1 ? "" : "s"}: {" "}
          {allowedRoots.join(", ")}. Symbolic links are rejected.
        </p>
      </div>
      <Field label="Maximum files per scan" htmlFor="folder-max-files">
        <Input
          id="folder-max-files"
          name="maxFiles"
          type="number"
          min="1"
          max="100000"
          defaultValue="10000"
          required
        />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input name="includeSubdirectories" type="checkbox" defaultChecked />
        Include subdirectories
      </label>
      <ScheduleFields prefix="folder" defaultMinutes={60} />
      <div className="space-y-3 md:col-span-2">
        <ActionMessage state={state} />
        <Button disabled={pending || !racks.length}>
          {pending ? "Creating…" : "Create shared-folder source"}
        </Button>
      </div>
    </form>
  );
}

export function WebSourceForm({ racks }: { racks: RackChoice[] }) {
  const [state, action, pending] = useActionState(createWebSourceAction, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <RackSelect id="web-rack" racks={racks} />
      <Field label="Source name" htmlFor="web-name" required>
        <Input
          id="web-name"
          name="name"
          placeholder="Employee handbook"
          required
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Page URL" htmlFor="web-url" required>
          <Input
            id="web-url"
            name="url"
            type="url"
            placeholder="https://docs.example.com/handbook"
            required
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field
          label="Allowed domains (one per line)"
          htmlFor="web-domains"
          required
        >
          <textarea
            id="web-domains"
            name="allowedDomains"
            className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm"
            placeholder="docs.example.com"
            required
          />
        </Field>
        <p className="mt-1 text-xs text-muted-foreground">
          Links are followed up to two levels on the exact starting hostname.
          Every DNS answer, redirect, and canonical URL must remain public.
        </p>
      </div>
      <Field label="Timeout (milliseconds)" htmlFor="web-timeout">
        <Input
          id="web-timeout"
          name="timeoutMs"
          type="number"
          min="1000"
          max="60000"
          defaultValue="15000"
          required
        />
      </Field>
      <Field label="Maximum response bytes" htmlFor="web-bytes">
        <Input
          id="web-bytes"
          name="maxBytes"
          type="number"
          min="1024"
          max="26214400"
          defaultValue="5242880"
          required
        />
      </Field>
      <Field label="Maximum redirects" htmlFor="web-redirects">
        <Input
          id="web-redirects"
          name="maxRedirects"
          type="number"
          min="0"
          max="5"
          defaultValue="3"
          required
        />
      </Field>
      <ScheduleFields prefix="web" defaultMinutes={360} />
      <div className="space-y-3 md:col-span-2">
        <ActionMessage state={state} />
        <Button disabled={pending || !racks.length}>
          {pending ? "Creating…" : "Create web source"}
        </Button>
      </div>
    </form>
  );
}
