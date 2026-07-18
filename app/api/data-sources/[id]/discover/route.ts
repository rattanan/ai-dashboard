import { OrganizationRole } from "@/generated/prisma/enums";
import { requireAuthorization } from "@/server/auth/authorization";
import { discoverDataSource } from "@/server/services/data-source-service";
import { failure } from "@/types/result";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await requireAuthorization(OrganizationRole.ADMIN);
    const { id } = await context.params;
    const result = await discoverDataSource(authorization, id);
    return Response.json(result, {
      status: result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 422,
    });
  } catch {
    return Response.json(
      failure("FORBIDDEN", "You do not have access to this data source."),
      { status: 403 },
    );
  }
}
