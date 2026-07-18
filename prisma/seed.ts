import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required to seed the database");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@ai-dashboard.local" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "demo@ai-dashboard.local",
      passwordHash: await hash("DemoPassword123!", {
        algorithm: 2,
        memoryCost: 19456,
        timeCost: 2,
      }),
    },
  });
  const organization = await prisma.organization.upsert({
    where: { slug: "demo-organization" },
    update: { name: "Demo Organization" },
    create: { name: "Demo Organization", slug: "demo-organization" },
  });
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: { organizationId: organization.id, userId: user.id, role: "OWNER" },
  });
  const workspace = await prisma.workspace.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "analytics",
      },
    },
    update: { name: "Analytics" },
    create: {
      organizationId: organization.id,
      name: "Analytics",
      slug: "analytics",
      createdById: user.id,
    },
  });
  let dataSource = await prisma.dataSource.findFirst({
    where: {
      workspaceId: workspace.id,
      name: "Reporting PostgreSQL (planned)",
    },
  });
  dataSource ??= await prisma.dataSource.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      name: "Reporting PostgreSQL (planned)",
      type: "POSTGRESQL",
      status: "DRAFT",
      host: "postgres.example.invalid",
      port: 5432,
      databaseName: "reporting",
      username: "readonly_demo",
    },
  });
  let dashboard = await prisma.dashboard.findFirst({
    where: { workspaceId: workspace.id, name: "Executive Revenue Overview" },
  });
  dashboard ??= await prisma.dashboard.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      name: "Executive Revenue Overview",
      businessArea: "Revenue operations",
      businessObjective:
        "Monitor revenue performance, pipeline coverage, and forecast risk across operating regions.",
      desiredKpis: "Revenue, pipeline coverage, forecast accuracy, win rate",
      targetUsers: "Executive leadership",
      dataSources: { create: { dataSourceId: dataSource.id } },
      versions: {
        create: {
          version: 1,
          createdById: user.id,
          snapshot: { phase: 0, seeded: true, status: "DRAFT" },
        },
      },
    },
  });
  console.log(
    `Seeded demo user ${user.email}, workspace ${workspace.name}, and dashboard ${dashboard.name}.`,
  );
}

main().finally(() => prisma.$disconnect());
