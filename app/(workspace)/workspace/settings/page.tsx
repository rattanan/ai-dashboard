import { requireAuthorization } from "@/server/auth/authorization";
import { db } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Workspace settings" };
export default async function SettingsPage() {
  const context = await requireAuthorization();
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: context.workspaceId },
    include: {
      organization: {
        include: {
          members: { include: { user: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  return (
    <div className="space-y-7">
      <PageHeader
        title="Workspace settings"
        description="Organization membership is visible here. Invitations and advanced permission editing arrive in a later phase."
      />
      <Card>
        <CardHeader>
          <CardTitle>{workspace.organization.name}</CardTitle>
          <CardDescription>Workspace: {workspace.name}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {workspace.organization.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {member.user.name || "Unnamed user"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Badge tone={member.role === "OWNER" ? "info" : "neutral"}>
                {member.role.replaceAll("_", " ")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
