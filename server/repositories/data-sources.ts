import type { AuthorizationContext } from "@/server/auth/authorization";
import { db } from "@/server/db";

export const dataSourceRepository = {
  list(context: AuthorizationContext) {
    return db.dataSource.findMany({
      where: { workspaceId: context.workspaceId },
      include: {
        credential: { select: { id: true } },
        file: true,
        _count: { select: { schemas: true, dashboards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },
  find(context: AuthorizationContext, id: string) {
    return db.dataSource.findFirst({
      where: { id, workspaceId: context.workspaceId },
      include: {
        credential: true,
        file: true,
        schemas: {
          include: { tables: { include: { columns: true } } },
          orderBy: { name: "asc" },
        },
        dashboards: { include: { dashboard: true } },
      },
    });
  },
};
