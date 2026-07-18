import path from "node:path";
import { OrganizationRole } from "@/generated/prisma/enums";
import { requireAuthorization } from "@/server/auth/authorization";
import { db } from "@/server/db";
import { ExcelUploadService } from "@/server/services/excel";
import { LocalObjectStorageService } from "@/server/storage/local-storage";
import { env } from "@/schemas/env";
import { failure, success } from "@/types/result";

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization(OrganizationRole.ADMIN);
    const formData = await request.formData();
    const file = formData.get("file");
    const name = String(formData.get("name") ?? "").trim();
    if (!(file instanceof File) || name.length < 2)
      return Response.json(
        failure("VALIDATION_ERROR", "Provide a connection name and workbook."),
        { status: 422 },
      );
    const config = env();
    if (config.OBJECT_STORAGE_DRIVER !== "local")
      return Response.json(
        failure(
          "CONNECTOR_NOT_IMPLEMENTED",
          "The Google Cloud Storage adapter is not configured yet.",
        ),
        { status: 501 },
      );
    const service = new ExcelUploadService(
      new LocalObjectStorageService(path.resolve(config.LOCAL_STORAGE_PATH)),
      config.MAX_EXCEL_UPLOAD_BYTES,
    );
    const uploaded = await service.upload(file);
    if (!uploaded.ok) return Response.json(uploaded, { status: 422 });
    const source = await db.$transaction(async (tx) => {
      const created = await tx.dataSource.create({
        data: {
          workspaceId: context.workspaceId,
          createdById: context.userId,
          name,
          type: "EXCEL",
          status: "CONNECTED",
          lastConnectedAt: new Date(),
          file: {
            create: {
              storageKey: uploaded.data.key,
              originalName: uploaded.data.originalName,
              mimeType: uploaded.data.mimeType || "application/octet-stream",
              sizeBytes: uploaded.data.size,
              checksum: uploaded.data.checksum,
              sheetNames: uploaded.data.sheetNames,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          actorId: context.userId,
          action: "EXCEL_UPLOADED",
          entityType: "DataSource",
          entityId: created.id,
          metadata: {
            sizeBytes: uploaded.data.size,
            sheets: uploaded.data.sheetNames.length,
          },
        },
      });
      return created;
    });
    return Response.json(
      success({ id: source.id, sheetNames: uploaded.data.sheetNames }),
      { status: 201 },
    );
  } catch {
    return Response.json(
      failure(
        "FORBIDDEN",
        "You do not have permission to upload this workbook.",
      ),
      { status: 403 },
    );
  }
}
