"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import {
  legacyApiIdSchema,
  legacyApiInvocationInputSchema,
  legacyApiRegistrySchema,
} from "@/schemas/legacy-api";
import { sourceAssignmentSchema } from "@/schemas/knowledge";
import {
  deleteLegacyApi,
  generateLegacyApiToolDefinition,
  saveLegacyApi,
  testLegacyApi,
} from "@/server/services/legacy-api-service";
import { failure } from "@/types/result";
import { updateSourceAssignment } from "@/server/services/unified-source-service";

function json(value: FormDataEntryValue | null, fallback: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return { ok: true as const, value: fallback };
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const };
  }
}

export async function saveLegacyApiAction(_state: unknown, formData: FormData) {
  const context = await requireAuthorization();
  await requirePermission(context, "legacy_api.manage");
  const parsedJson = {
    requestHeaders: json(formData.get("requestHeadersJson"), {}),
    parameters: json(formData.get("parametersJson"), []),
    bodyTemplate: json(formData.get("bodyTemplateJson"), null),
    responseSchema: json(formData.get("responseSchemaJson"), {}),
    responseMapping: json(formData.get("responseMappingJson"), {}),
  };
  if (Object.values(parsedJson).some((item) => !item.ok))
    return failure(
      "VALIDATION_ERROR",
      "Headers, parameters, templates, schema, and mapping must contain valid JSON.",
    );
  const parsed = legacyApiRegistrySchema.safeParse({
    ...Object.fromEntries(formData),
    allowedDomains: String(formData.get("allowedDomains") ?? "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
    requestHeaders: parsedJson.requestHeaders.value,
    parameters: parsedJson.parameters.value,
    bodyTemplate: parsedJson.bodyTemplate.value,
    responseSchema: parsedJson.responseSchema.value,
    responseMapping: parsedJson.responseMapping.value,
  });
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "Check the Legacy API definition.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  const assignment = sourceAssignmentSchema.safeParse({
    sourceType: "API_TOOL",
    sourceId: String(formData.get("legacyApiId") ?? "pending"),
    scope: formData.get("sourceScope"),
    botIds: formData.getAll("botIds"),
    enabled: formData.get("enabled"),
    priority: formData.get("priority"),
  });
  if (!assignment.success)
    return failure(
      "VALIDATION_ERROR",
      "Check the API scope and bot assignments.",
      {
        fieldErrors: assignment.error.flatten().fieldErrors,
      },
    );
  await requirePermission(context, "bot.manage");
  const result = await saveLegacyApi(context, parsed.data);
  if (result.ok) {
    const assigned = await updateSourceAssignment(context, {
      ...assignment.data,
      sourceId: result.data.id,
    });
    if (!assigned.ok) return assigned;
    revalidatePath("/workspace/sources/api-tools");
    revalidatePath("/workspace/admin/bots");
    revalidatePath("/workspace/sources");
  }
  return result;
}

export async function testLegacyApiAction(_state: unknown, formData: FormData) {
  const context = await requireAuthorization();
  await requirePermission(context, "legacy_api.manage");
  const parsed = legacyApiIdSchema.safeParse({ id: formData.get("id") });
  const parameters = json(formData.get("parametersJson"), {});
  if (!parsed.success || !parameters.ok)
    return failure("VALIDATION_ERROR", "Provide valid JSON test parameters.");
  const invocation = legacyApiInvocationInputSchema.safeParse({
    legacyApiId: parsed.success ? parsed.data.id : "",
    question: "Administrator connection test",
    parameters: parameters.value,
  });
  if (!invocation.success)
    return failure(
      "VALIDATION_ERROR",
      "Test parameters must be a JSON object.",
    );
  return testLegacyApi(
    context,
    invocation.data.legacyApiId,
    invocation.data.parameters,
  );
}

export async function generateLegacyApiToolDefinitionAction(
  _state: unknown,
  formData: FormData,
) {
  const context = await requireAuthorization();
  await requirePermission(context, "legacy_api.manage");
  const parsed = legacyApiIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "API tool is required.");
  return generateLegacyApiToolDefinition(context, parsed.data.id);
}

export async function deleteLegacyApiAction(
  _state: unknown,
  formData: FormData,
) {
  const context = await requireAuthorization();
  await requirePermission(context, "legacy_api.manage");
  const parsed = legacyApiIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "Legacy API is required.");
  const result = await deleteLegacyApi(context, parsed.data.id);
  if (result.ok) {
    revalidatePath("/workspace/sources/api-tools");
    revalidatePath("/workspace/admin/bots");
    redirect("/workspace/sources/api-tools");
  }
  return result;
}
