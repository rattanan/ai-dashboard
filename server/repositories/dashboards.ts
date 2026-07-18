import type { AuthorizationContext } from "@/server/auth/authorization";
import { db } from "@/server/db";

export const dashboardRepository = {
  list(context: AuthorizationContext) {
    return db.dashboard.findMany({
      where: { workspaceId: context.workspaceId },
      include: {
        dataSources: { include: { dataSource: true } },
        _count: { select: { versions: true, widgets: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },
  find(context: AuthorizationContext, id: string) {
    return db.dashboard.findFirst({
      where: { id, workspaceId: context.workspaceId },
      include: {
        dataSources: { include: { dataSource: true } },
        versions: { orderBy: { version: "desc" } },
        widgets: { orderBy: { position: "asc" } },
      },
    });
  },
};
