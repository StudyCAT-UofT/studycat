import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin system...");

  // Create or find admin user
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      givenName: "System",
      familyName: "Administrator",
      isAdmin: true,
    },
  });

  console.log("✅ Admin user ready:", adminUser.username);

  console.log("🎉 Seeding finished.");
}

main()
  .catch((e) => {
    console.error("Seed Failed: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
