import { redirect } from "next/navigation";
import {
  requireUser,
  getAuthorizationContext,
} from "@/server/auth/authorization";
import { db } from "@/server/db";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

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
  return (
    <WorkspaceShell
      user={user}
      workspace={{
        name: workspace.name,
        organizationName: workspace.organization.name,
      }}
    >
      {children}
    </WorkspaceShell>
  );
}
