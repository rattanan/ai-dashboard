"use server";

import { redirect } from "next/navigation";
import { OrganizationRole } from "@/generated/prisma/enums";
import {
  databaseConnectionSchema,
  dashboardAppearanceSchema,
  dashboardObjectiveSchema,
  deleteDataSourceSchema,
} from "@/schemas/data-source";
import { requireAuthorization } from "@/server/auth/authorization";
import {
  createDatabaseDataSource,
  deleteDataSource,
} from "@/server/services/data-source-service";
import { db } from "@/server/db";
import { logger } from "@/server/services/logger";
import { failure, success } from "@/types/result";
import type { AppResult } from "@/types/result";

export async function createDatabaseDataSourceAction(input: unknown) {
  const context = await requireAuthorization(OrganizationRole.ADMIN);
  const parsed = databaseConnectionSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_ERROR",
      "Please correct the connection details.",
      { fieldErrors: parsed.error.flatten().fieldErrors },
    );
  return createDatabaseDataSource(context, parsed.data);
}

export async function deleteDataSourceAction(
  _previous: AppResult<{ deleted: true; id: string }> | null,
  formData: FormData,
) {
  const context = await requireAuthorization(OrganizationRole.ADMIN);
  const parsed = deleteDataSourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "Confirm the data source name to delete it.",
      {
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    );
  }
  return deleteDataSource(
    context,
    parsed.data.dataSourceId,
    parsed.data.confirmationName,
  );
}

export async function saveDataScopeAction(
  dataSourceId: string,
  tableIds: string[],
) {
  const context = await requireAuthorization(OrganizationRole.ADMIN);
  const source = await db.dataSource.findFirst({
    where: { id: dataSourceId, workspaceId: context.workspaceId },
  });
  if (!source) return failure("NOT_FOUND", "Data source not found.");
  await db.$transaction([
    db.dataSourceTable.updateMany({
      where: { schema: { dataSourceId } },
      data: { selected: false },
    }),
    db.dataSourceTable.updateMany({
      where: { id: { in: tableIds }, schema: { dataSourceId } },
      data: { selected: true },
    }),
  ]);
  return success({ selected: tableIds.length });
}

export async function saveObjectiveAction(input: unknown) {
  const context = await requireAuthorization(
    OrganizationRole.DASHBOARD_DESIGNER,
  );
  const parsed = dashboardObjectiveSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_ERROR",
      "Please complete the dashboard objective.",
      { fieldErrors: parsed.error.flatten().fieldErrors },
    );
  const source = await db.dataSource.findFirst({
    where: { id: parsed.data.dataSourceId, workspaceId: context.workspaceId },
  });
  if (!source) return failure("NOT_FOUND", "Data source not found.");
  const values = {
    name: parsed.data.name,
    businessArea: parsed.data.businessArea,
    businessObjective: parsed.data.businessObjective,
    businessQuestions: parsed.data.businessQuestions,
    desiredKpis: parsed.data.desiredKpis,
    targetUsers: parsed.data.targetUsers,
    reportingPeriod: parsed.data.reportingPeriod,
    importantFilters: parsed.data.importantFilters,
  };
  const dashboard = parsed.data.dashboardId
    ? await db.dashboard.update({
        where: {
          id: parsed.data.dashboardId,
          workspaceId: context.workspaceId,
        },
        data: values,
      })
    : await db.dashboard.create({
        data: {
          ...values,
          workspaceId: context.workspaceId,
          createdById: context.userId,
          dataSources: { create: { dataSourceId: source.id } },
        },
      });
  return success({ dashboardId: dashboard.id });
}

export async function saveAppearanceAction(input: unknown) {
  const context = await requireAuthorization(
    OrganizationRole.DASHBOARD_DESIGNER,
  );
  const parsed = dashboardAppearanceSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "Choose a layout, style, and theme.");
  const { dashboardId, ...appearance } = parsed.data;
  const requestId = crypto.randomUUID();
  try {
    const dashboard = await db.dashboard.findFirst({
      where: { id: dashboardId, workspaceId: context.workspaceId },
      select: { id: true },
    });
    if (!dashboard) return failure("NOT_FOUND", "Dashboard draft not found.");

    await db.dashboard.update({
      where: { id: dashboard.id },
      data: appearance,
    });
    return success({ dashboardId: dashboard.id });
  } catch (error) {
    logger.error("Dashboard appearance update failed", {
      requestId,
      dashboardId,
      workspaceId: context.workspaceId,
      error,
    });
    return failure(
      "INTERNAL_ERROR",
      "The dashboard appearance could not be saved. Try again.",
      {
        requestId,
        diagnostics: { operation: "saveDashboardAppearance" },
      },
    );
  }
}

export async function startAnalysisAction(dashboardId: string) {
  const context = await requireAuthorization(
    OrganizationRole.DASHBOARD_DESIGNER,
  );
  const dashboard = await db.dashboard.findFirst({
    where: { id: dashboardId, workspaceId: context.workspaceId },
    include: {
      dataSources: {
        include: {
          dataSource: {
            include: {
              schemas: { include: { tables: { where: { selected: true } } } },
            },
          },
        },
      },
    },
  });
  if (!dashboard?.businessObjective || !dashboard.dataSources.length)
    return failure(
      "VALIDATION_ERROR",
      "Complete the objective and data source steps first.",
    );
  const selectedTables = dashboard.dataSources.flatMap((item) =>
    item.dataSource.schemas.flatMap((schema) =>
      schema.tables.map((table) => `${schema.name}.${table.name}`),
    ),
  );
  await db.$transaction([
    db.dashboardVersion.create({
      data: {
        dashboardId,
        version: 1,
        createdById: context.userId,
        snapshot: {
          name: dashboard.name,
          objective: dashboard.businessObjective,
          layout: dashboard.layoutStyle,
          visualStyle: dashboard.visualStyle,
          theme: dashboard.visualTheme,
          selectedTables,
        },
      },
    }),
    db.dashboard.update({
      where: { id: dashboardId },
      data: { status: "ANALYZING" },
    }),
  ]);
  redirect(`/workspace/dashboards/${dashboardId}`);
}
