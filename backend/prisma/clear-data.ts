import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [scrutinyReports, documents, applications] = await prisma.$transaction([
    prisma.scrutinyReport.deleteMany(),
    prisma.document.deleteMany(),
    prisma.application.deleteMany(),
  ]);

  console.info(
    `Cleared ${scrutinyReports.count} scrutiny reports, ${documents.count} documents, and ${applications.count} applications.`,
  );
} catch (error) {
  console.error("Failed to clear database records:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
