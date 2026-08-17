"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createKnowledgeRackAction,
  deleteBotAction,
  saveBotAction,
} from "@/features/knowledge/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ActionState =
  | { ok: true; data: unknown }
  | { ok: false; error: { message: string } }
  | null;

function ActionMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      aria-live="polite"
      className={
        state.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"
      }
    >
      {state.ok ? "Saved successfully." : state.error.message}
    </p>
  );
}

type Choice = { id: string; name: string };

type BotValue = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  systemPrompt: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  active: boolean;
  providerId: string | null;
  model: string | null;
  temperature: number;
  maxTokens: number;
  contextSize: number;
  citationEnabled: boolean;
  memoryMode: string;
  rackIds: string[];
  dataSourceIds: string[];
  legacyApiIds: string[];
  roleIds: string[];
  userIds: string[];
};

export function BotConfigurationForm({
  bot,
  racks,
  roles,
  users,
  providers,
  dataSources,
  legacyApis,
}: {
  bot?: BotValue;
  racks: Choice[];
  roles: Choice[];
  users: Choice[];
  providers: Choice[];
  dataSources: Choice[];
  legacyApis: Choice[];
}) {
  const [state, action, pending] = useActionState(saveBotAction, null);
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      {bot ? <input type="hidden" name="botId" value={bot.id} /> : null}
      <Field label="Bot name" htmlFor={`bot-name-${bot?.id ?? "new"}`} required>
        <Input
          id={`bot-name-${bot?.id ?? "new"}`}
          name="name"
          defaultValue={bot?.name}
          required
        />
      </Field>
      <Field label="Avatar URL" htmlFor={`bot-avatar-${bot?.id ?? "new"}`}>
        <Input
          id={`bot-avatar-${bot?.id ?? "new"}`}
          name="avatarUrl"
          type="url"
          defaultValue={bot?.avatarUrl ?? ""}
        />
      </Field>
      <div className="lg:col-span-2">
        <Field
          label="Description"
          htmlFor={`bot-description-${bot?.id ?? "new"}`}
        >
          <textarea
            id={`bot-description-${bot?.id ?? "new"}`}
            name="description"
            defaultValue={bot?.description ?? ""}
            className="min-h-20 w-full rounded-lg border bg-white p-3 text-sm"
          />
        </Field>
      </div>
      <div className="lg:col-span-2">
        <Field
          label="System prompt"
          htmlFor={`bot-prompt-${bot?.id ?? "new"}`}
          required
        >
          <textarea
            id={`bot-prompt-${bot?.id ?? "new"}`}
            name="systemPrompt"
            defaultValue={
              bot?.systemPrompt ??
              "ตอบคำถามจากฐานความรู้ขององค์กรอย่างกระชับ ชัดเจน และอ้างอิงแหล่งข้อมูลทุกครั้ง"
            }
            className="min-h-32 w-full rounded-lg border bg-white p-3 text-sm"
            required
          />
        </Field>
      </div>
      <Field
        label="Welcome message"
        htmlFor={`bot-welcome-${bot?.id ?? "new"}`}
        required
      >
        <textarea
          id={`bot-welcome-${bot?.id ?? "new"}`}
          name="welcomeMessage"
          defaultValue={
            bot?.welcomeMessage ??
            "สวัสดีครับ มีอะไรให้ช่วยค้นหาจากฐานความรู้ขององค์กร?"
          }
          className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm"
          required
        />
      </Field>
      <Field
        label="Suggested questions (one per line)"
        htmlFor={`bot-questions-${bot?.id ?? "new"}`}
      >
        <textarea
          id={`bot-questions-${bot?.id ?? "new"}`}
          name="suggestedQuestions"
          defaultValue={bot?.suggestedQuestions.join("\n") ?? ""}
          className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm"
        />
      </Field>
      <Field label="LLM provider" htmlFor={`bot-provider-${bot?.id ?? "new"}`}>
        <select
          id={`bot-provider-${bot?.id ?? "new"}`}
          name="providerId"
          defaultValue={bot?.providerId ?? ""}
          className="min-h-11 w-full rounded-lg border bg-white px-3"
        >
          <option value="">Active organization provider</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Chat model override"
        htmlFor={`bot-model-${bot?.id ?? "new"}`}
      >
        <Input
          id={`bot-model-${bot?.id ?? "new"}`}
          name="model"
          defaultValue={bot?.model ?? ""}
        />
      </Field>
      <Field label="Temperature" htmlFor={`bot-temp-${bot?.id ?? "new"}`}>
        <Input
          id={`bot-temp-${bot?.id ?? "new"}`}
          name="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          defaultValue={bot?.temperature ?? 0.1}
          required
        />
      </Field>
      <Field
        label="Max output tokens"
        htmlFor={`bot-tokens-${bot?.id ?? "new"}`}
      >
        <Input
          id={`bot-tokens-${bot?.id ?? "new"}`}
          name="maxTokens"
          type="number"
          min="128"
          max="32000"
          defaultValue={bot?.maxTokens ?? 2048}
          required
        />
      </Field>
      <Field
        label="Context characters"
        htmlFor={`bot-context-${bot?.id ?? "new"}`}
      >
        <Input
          id={`bot-context-${bot?.id ?? "new"}`}
          name="contextSize"
          type="number"
          min="1000"
          max="100000"
          defaultValue={bot?.contextSize ?? 12000}
          required
        />
      </Field>
      <Field label="Memory mode" htmlFor={`bot-memory-${bot?.id ?? "new"}`}>
        <select
          id={`bot-memory-${bot?.id ?? "new"}`}
          name="memoryMode"
          defaultValue={bot?.memoryMode ?? "CONVERSATION"}
          className="min-h-11 w-full rounded-lg border bg-white px-3"
        >
          <option value="CONVERSATION">Current conversation</option>
          <option value="USER_CONSENTED">
            Conversation + user-consented memory
          </option>
          <option value="NONE">No memory</option>
        </select>
      </Field>
      <Field label="Knowledge racks" htmlFor={`bot-racks-${bot?.id ?? "new"}`}>
        <select
          id={`bot-racks-${bot?.id ?? "new"}`}
          name="rackIds"
          multiple
          defaultValue={bot?.rackIds ?? []}
          className="min-h-28 w-full rounded-lg border bg-white p-2"
        >
          {racks.map((rack) => (
            <option key={rack.id} value={rack.id}>
              {rack.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Database sources"
        htmlFor={`bot-data-sources-${bot?.id ?? "new"}`}
        hint="Only selected tables within these connected sources can be queried."
      >
        <select
          id={`bot-data-sources-${bot?.id ?? "new"}`}
          name="dataSourceIds"
          multiple
          defaultValue={bot?.dataSourceIds ?? []}
          className="min-h-28 w-full rounded-lg border bg-white p-2"
        >
          {dataSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Legacy API tools"
        htmlFor={`bot-legacy-apis-${bot?.id ?? "new"}`}
        hint="The bot can invoke only selected APIs. User ACL is checked again for every call."
      >
        <select
          id={`bot-legacy-apis-${bot?.id ?? "new"}`}
          name="legacyApiIds"
          multiple
          defaultValue={bot?.legacyApiIds ?? []}
          className="min-h-28 w-full rounded-lg border bg-white p-2"
        >
          {legacyApis.map((api) => (
            <option key={api.id} value={api.id}>
              {api.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Roles allowed to use this bot"
        htmlFor={`bot-roles-${bot?.id ?? "new"}`}
      >
        <select
          id={`bot-roles-${bot?.id ?? "new"}`}
          name="roleIds"
          multiple
          defaultValue={bot?.roleIds ?? []}
          className="min-h-28 w-full rounded-lg border bg-white p-2"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Individual users allowed to use this bot"
        htmlFor={`bot-users-${bot?.id ?? "new"}`}
      >
        <select
          id={`bot-users-${bot?.id ?? "new"}`}
          name="userIds"
          multiple
          defaultValue={bot?.userIds ?? []}
          className="min-h-28 w-full rounded-lg border bg-white p-2"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          name="citationEnabled"
          type="checkbox"
          defaultChecked={bot?.citationEnabled ?? true}
        />{" "}
        Require citations
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={bot?.active ?? false}
        />{" "}
        Active and visible to assigned users
      </label>
      <div className="space-y-3 lg:col-span-2">
        <ActionMessage state={state} />
        <Button disabled={pending}>
          {pending ? "Saving…" : bot ? "Save new version" : "Create bot"}
        </Button>
      </div>
    </form>
  );
}

export function KnowledgeRackForm({ roles }: { roles: Choice[] }) {
  const [state, action, pending] = useActionState(
    createKnowledgeRackAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="Rack name" htmlFor="rack-name" required>
        <Input id="rack-name" name="name" required />
      </Field>
      <Field label="Description" htmlFor="rack-description">
        <Input id="rack-description" name="description" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Roles granted access" htmlFor="rack-roleIds">
          <select
            id="rack-roleIds"
            name="roleIds"
            multiple
            className="min-h-28 w-full rounded-lg border bg-white p-2"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Selected role access level" htmlFor="rack-access-level">
        <select
          id="rack-access-level"
          name="accessLevel"
          defaultValue="READ"
          className="min-h-11 w-full rounded-lg border bg-white px-3"
        >
          <option value="READ">Read and retrieve</option>
          <option value="UPLOAD">Read, upload, and retry indexing</option>
          <option value="MANAGE">Manage rack</option>
        </select>
      </Field>
      <div className="space-y-3 md:col-span-2">
        <ActionMessage state={state} />
        <Button disabled={pending}>
          {pending ? "Creating…" : "Create knowledge rack"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteBotForm({
  botId,
  botName,
}: {
  botId: string;
  botName: string;
}) {
  return (
    <form
      action={deleteBotAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${botName} and all of its chat history permanently?`,
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={botId} />
      <Button variant="destructive">Delete bot</Button>
    </form>
  );
}

export function DocumentUploadForm({ rackId }: { rackId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/knowledge-racks/${rackId}/documents`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        duplicate?: boolean;
        message?: string;
      };
      setMessage(
        response.ok
          ? payload.duplicate
            ? "This exact file is already indexed or queued."
            : "Upload accepted. Indexing is queued."
          : (payload.message ?? "Upload failed."),
      );
      if (response.ok) router.refresh();
    } catch {
      setMessage("Upload failed. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      action={submit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Field label="Add document" htmlFor={`document-${rackId}`} required>
        <Input
          id={`document-${rackId}`}
          name="file"
          type="file"
          accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.markdown,.html,.htm"
          required
        />
      </Field>
      <Button disabled={pending}>
        {pending ? "Uploading…" : "Upload & index"}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {message}
      </p>
    </form>
  );
}
