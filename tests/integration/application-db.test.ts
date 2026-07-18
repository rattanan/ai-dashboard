import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { AesGcmCredentialEncryptionService } from "@/server/services/encryption";
import { deleteDataSource } from "@/server/services/data-source-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    })
  : null;

describe.skipIf(!prisma)("application database integration", () => {
  afterAll(async () => prisma?.$disconnect());

  it("persists encrypted credentials, audit/version records, and isolates workspaces", async () => {
    const suffix = crypto.randomUUID();
    const owner = await prisma!.user.create({
      data: { email: `owner-${suffix}@example.test` },
    });
    const outsider = await prisma!.user.create({
      data: { email: `outsider-${suffix}@example.test` },
    });
    const organization = await prisma!.organization.create({
      data: {
        name: "Integration Organization",
        slug: `integration-${suffix}`,
        members: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    const otherOrganization = await prisma!.organization.create({
      data: {
        name: "Other Organization",
        slug: `other-${suffix}`,
        members: { create: { userId: outsider.id, role: "OWNER" } },
      },
    });
    const workspace = await prisma!.workspace.create({
      data: {
        organizationId: organization.id,
        createdById: owner.id,
        name: "Primary",
        slug: "primary",
      },
    });
    const otherWorkspace = await prisma!.workspace.create({
      data: {
        organizationId: otherOrganization.id,
        createdById: outsider.id,
        name: "Other",
        slug: "other",
      },
    });
    const envelope = new AesGcmCredentialEncryptionService(
      Buffer.alloc(32, 9),
    ).encrypt(JSON.stringify({ password: "never-plaintext" }));
    const source = await prisma!.dataSource.create({
      data: {
        workspaceId: workspace.id,
        createdById: owner.id,
        name: "MySQL fixture",
        type: "MYSQL",
        credential: { create: envelope },
      },
      include: { credential: true },
    });
    const dashboard = await prisma!.dashboard.create({
      data: {
        workspaceId: workspace.id,
        createdById: owner.id,
        name: "Integration dashboard",
        businessObjective:
          "Verify dashboard persistence and immutable version creation.",
        dataSources: { create: { dataSourceId: source.id } },
        versions: {
          create: {
            version: 1,
            createdById: owner.id,
            snapshot: { verified: true },
          },
        },
      },
      include: { versions: true },
    });
    await prisma!.auditLog.create({
      data: {
        organizationId: organization.id,
        workspaceId: workspace.id,
        actorId: owner.id,
        action: "DATA_SOURCE_CREATED",
        entityType: "DataSource",
        entityId: source.id,
      },
    });

    expect(source.credential?.ciphertext).not.toContain("never-plaintext");
    expect(dashboard.versions).toHaveLength(1);
    expect(
      await prisma!.dataSource.findFirst({
        where: { id: source.id, workspaceId: otherWorkspace.id },
      }),
    ).toBeNull();
    expect(
      await prisma!.auditLog.count({
        where: { organizationId: organization.id },
      }),
    ).toBe(1);

    const deletion = await deleteDataSource(
      {
        userId: owner.id,
        organizationId: organization.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
      source.id,
      source.name,
    );
    expect(deletion.ok).toBe(true);
    expect(
      await prisma!.dataSource.findUnique({ where: { id: source.id } }),
    ).toBeNull();
    expect(
      await prisma!.dashboard.findUnique({ where: { id: dashboard.id } }),
    ).not.toBeNull();
    expect(
      await prisma!.dashboardDataSource.count({
        where: { dashboardId: dashboard.id },
      }),
    ).toBe(0);
    expect(
      await prisma!.auditLog.count({
        where: { organizationId: organization.id },
      }),
    ).toBe(2);

    await prisma!.organization.delete({ where: { id: organization.id } });
    await prisma!.organization.delete({ where: { id: otherOrganization.id } });
    await prisma!.user.deleteMany({
      where: { id: { in: [owner.id, outsider.id] } },
    });
  });
});
