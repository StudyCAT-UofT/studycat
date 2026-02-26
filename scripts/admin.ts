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
    },
  });

  console.log("✅ Admin user ready:", adminUser.username);

  // Create or find SYSTEM course
  const systemCourse = await prisma.course.upsert({
    where: {
      code_title: {
        code: "SYSTEM",
        title: "System Administration",
      },
    },
    update: {},
    create: {
      code: "SYSTEM",
      title: "System Administration",
    },
  });

  console.log("✅ SYSTEM course ready");

  // Create or find ADMIN term
  const adminTerm = await prisma.term.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
    },
  });

  console.log("✅ ADMIN term ready");

  // Create or find special offering
  const adminOffering = await prisma.courseOffering.upsert({
    where: {
      courseId_termId: {
        courseId: systemCourse.id,
        termId: adminTerm.id,
      },
    },
    update: {},
    create: {
      courseId: systemCourse.id,
      termId: adminTerm.id,
      display: "System Admin Offering",
    },
  });

  console.log("✅ Admin offering ready");

  // Enroll admin user as ADMIN
  await prisma.enrollment.upsert({
    where: {
      userId_offeringId: {
        userId: adminUser.id,
        offeringId: adminOffering.id,
      },
    },
    update: {
      offeringRole: "ADMIN",
    },
    create: {
      userId: adminUser.id,
      offeringId: adminOffering.id,
      offeringRole: "ADMIN",
    },
  });

  console.log("✅ Admin enrollment complete");

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