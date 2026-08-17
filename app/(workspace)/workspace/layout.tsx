import { redirect } from "next/navigation";
import {
  requireUser,
  getAuthorizationContext,
} from "@/server/auth/authorization";
import { db } from "@/server/db";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getPermissionKeys } from "@/server/auth/permissions";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const context = await getAuthorizationContext();
  if (!context) redirect("/onboarding");
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: context.workspaceId },
    include: { organization: true },
  });
  const permissions = await getPermissionKeys(context);
  return (
    <WorkspaceShell
      user={user}
      workspace={{
        name: workspace.name,
        organizationName: workspace.organization.name,
      }}
      navigation={{
        administration: permissions.has("user.update"),
        excel: permissions.has("excel.upload"),
        bots: permissions.has("bot.use"),
        knowledgeManagement:
          permissions.has("bot.manage") || permissions.has("knowledge.manage"),
        dataConnections:
          permissions.has("datasource.preview") ||
          permissions.has("datasource.create") ||
          permissions.has("datasource.update"),
        legacyApis: permissions.has("legacy_api.manage"),
        dashboards:
          permissions.has("dashboard.view") ||
          permissions.has("dashboard.create") ||
          permissions.has("dashboard.update"),
        insights: permissions.has("insight.manage"),
        chatAudit: permissions.has("chat.audit"),
      }}
    >
      {children}
    </WorkspaceShell>
  );
}
