/**
 * Database Seeding Script for Synthetic Scenarios & Phase 1 Accounts
 * 
 * Populates the development database with:
 * 1. Seeded Personnel: Ministry Administrator and Scrutiny Officers.
 * 2. 8 distinct synthetic applications with explicit officer assignments (and an unassigned exception).
 * 3. Associated document records with mocked VLM extraction outputs.
 * 4. Audit trail records and internal officer notifications.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { allSyntheticScenarios } from "../fixtures/mock-scenarios.fixture.js";
import { authService } from "../services/auth.service.js";

async function main() {
  console.log("==================================================================");
  console.log("PARAKH: Seeding Phase 1 Personnel & Synthetic Scenarios");
  console.log("==================================================================");

  // 1. Seed Personnel Accounts (Idempotent)
  console.log("\n[1/3] Provisioning authorized personnel accounts...");
  const accountsToSeed = [
    {
      email: "admin@aicte.gov.in",
      password: "Admin@AICTE2026!",
      name: "Dr. Sanjay Sharma",
      role: "MINISTRY_ADMIN",
      designation: "Director - Bureau of Approval",
      department: "AICTE HQ, New Delhi",
    },
    {
      email: "officer1@aicte.gov.in",
      password: "Officer@AICTE2026!",
      name: "Er. Rajiv Malhotra",
      role: "OFFICER",
      designation: "Senior Scrutiny Officer",
      department: "Northern & Central Regional Office",
    },
    {
      email: "officer2@aicte.gov.in",
      password: "Officer@AICTE2026!",
      name: "Dr. Sunita Deshmukh",
      role: "OFFICER",
      designation: "Regional Scrutiny Officer",
      department: "Western Regional Office",
    },
  ];

  const userMap: Record<string, string> = {};

  for (const acc of accountsToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: acc.email },
    });

    if (existing) {
      console.log(`  - Account ${acc.email} exists (${existing.id}), updating credentials...`);
      const { hash, salt } = authService.hashPassword(acc.password);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: acc.name,
          role: acc.role,
          designation: acc.designation,
          department: acc.department,
          passwordHash: hash,
          salt,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      userMap[acc.email] = updated.id;
    } else {
      console.log(`  - Creating account ${acc.email} (${acc.role})...`);
      const { hash, salt } = authService.hashPassword(acc.password);
      const created = await prisma.user.create({
        data: {
          email: acc.email,
          passwordHash: hash,
          salt,
          name: acc.name,
          role: acc.role,
          designation: acc.designation,
          department: acc.department,
          isActive: true,
        },
      });
      userMap[acc.email] = created.id;
    }
  }

  const officer1Id = userMap["officer1@aicte.gov.in"]!;
  const officer2Id = userMap["officer2@aicte.gov.in"]!;
  const adminId = userMap["admin@aicte.gov.in"]!;

  // 2. Storage Setup
  console.log("\n[2/3] Preparing document storage directory...");
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const placeholderFileName = "parakh-demo-placeholder.pdf";
  const placeholderFilePath = path.join(uploadsDir, placeholderFileName);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(placeholderFilePath);
  } catch {
    const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 170 >>
stream
BT
/F1 14 Tf
72 700 Td
(PARAKH Synthetic Demonstration Document) Tj
0 -24 Td
/F1 10 Tf
(For AICTE Approval Process Scrutiny Decision-Support System) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Producer (ReportLab PDF Library - AICTE Demonstration) /CreationDate (D:20261027000000Z) /ModDate (D:20261027000000Z) >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000458 00000 n 
0000000527 00000 n 
trailer
<< /Size 7 /Root 1 0 R /Info 6 0 R >>
startxref
665
%%EOF
`;
    await fs.writeFile(placeholderFilePath, minimalPdf, "latin1");
    fileBuffer = await fs.readFile(placeholderFilePath);
  }

  // 3. Iterate and seed each of the 8 scenarios with sensible assignments
  console.log("\n[3/3] Seeding applications with explicit officer ownership...");
  let totalAppsSeeded = 0;
  let totalDocsSeeded = 0;

  // Assignment distribution across the 8 scenarios:
  // Scenario 1: officer1 (Compliant baseline)
  // Scenario 2: officer1 (Missing docs)
  // Scenario 3: officer2 (Uncertain evidence)
  // Scenario 4: officer1 (Identity mismatch)
  // Scenario 5: officer2 (Land deficiencies)
  // Scenario 6: officer2 (Expired Fire NOC)
  // Scenario 7: officer1 (Infra deficit)
  // Scenario 8: null (Unassigned Exception queue demonstration)
  const assignmentMap: Array<string | null> = [
    officer1Id, // Scenario 1 -> Rajiv Malhotra
    officer1Id, // Scenario 2 -> Rajiv Malhotra
    officer2Id, // Scenario 3 -> Sunita Deshmukh
    officer1Id, // Scenario 4 -> Rajiv Malhotra
    officer2Id, // Scenario 5 -> Sunita Deshmukh
    officer2Id, // Scenario 6 -> Sunita Deshmukh
    officer1Id, // Scenario 7 -> Rajiv Malhotra
    null,       // Scenario 8 -> Unassigned Exception!
  ];

  for (const [index, scenario] of allSyntheticScenarios.entries()) {
    const assignedOfficerId = assignmentMap[index] ?? null;
    const assignedOfficerName = assignedOfficerId === officer1Id
      ? "Er. Rajiv Malhotra"
      : assignedOfficerId === officer2Id
      ? "Dr. Sunita Deshmukh"
      : "UNASSIGNED (Exception)";

    console.log(`\n[Scenario ${index + 1}/8] Seeding ${scenario.applicationNumber}: "${scenario.title}" (Assigned: ${assignedOfficerName})`);

    // Clean previous run of this specific synthetic application (idempotency)
    const existing = await prisma.application.findUnique({
      where: { applicationNumber: scenario.applicationNumber },
    });

    if (existing) {
      console.log(`  - Found existing seeded application (${existing.id}), cleaning prior records...`);
      await prisma.application.delete({
        where: { id: existing.id },
      });
    }

    // Create Application
    const app = await prisma.application.create({
      data: {
        applicationNumber: scenario.applicationNumber,
        institutionName: scenario.institutionName,
        programCategory: scenario.programCategory,
        proposedIntake: scenario.proposedIntake,
        status: scenario.status, // "EXTRACTION_COMPLETED"
        assignedOfficerId,
        assignedById: assignedOfficerId ? adminId : null,
        assignedAt: assignedOfficerId ? new Date() : null,
      },
    });

    // Create Audit Log for Application Creation & Assignment
    await prisma.auditLog.create({
      data: {
        applicationId: app.id,
        actorId: adminId,
        actorName: "Dr. Sanjay Sharma",
        actorRole: "MINISTRY_ADMIN",
        action: assignedOfficerId ? "APPLICATION_ASSIGNED" : "APPLICATION_CREATED",
        resourceType: "APPLICATION",
        resourceId: app.id,
        status: "SUCCESS",
        details: assignedOfficerId
          ? `Application ${app.applicationNumber} intake completed and assigned to ${assignedOfficerName}`
          : `Application ${app.applicationNumber} created in unassigned exception state`,
        metadata: {
          applicationNumber: app.applicationNumber,
          assignedOfficerId,
        },
      },
    });

    // If assigned, create an initial assignment notification for the officer
    if (assignedOfficerId) {
      await prisma.notification.create({
        data: {
          recipientId: assignedOfficerId,
          applicationId: app.id,
          type: "APPLICATION_ASSIGNED",
          title: `Application Assigned: ${app.applicationNumber}`,
          message: `Application ${app.applicationNumber} (${app.institutionName}) has been assigned to you for scrutiny by Dr. Sanjay Sharma.`,
          severity: "INFO",
          dedupKey: `notif_assign_${assignedOfficerId}_${app.id}`,
        },
      });
    } else {
      // Unassigned exception notification for Ministry Admin
      await prisma.notification.create({
        data: {
          recipientId: adminId,
          applicationId: app.id,
          type: "UNASSIGNED_APPLICATION",
          title: `Unassigned Application: ${app.applicationNumber}`,
          message: `Application ${app.applicationNumber} (${app.institutionName}) is currently unassigned and requires scrutiny officer allocation.`,
          severity: "WARNING",
          dedupKey: `notif_unassigned_${adminId}_${app.id}`,
        },
      });
    }

    // Create Document records with mocked extraction data
    for (const [dIdx, doc] of scenario.documents.entries()) {
      const envelope = {
        ...doc.extractedData,
        documentId: `seed-doc-${index + 1}-${dIdx + 1}`,
      };

      const docFileName = `demo-app${index + 1}-doc${dIdx + 1}.pdf`;
      const docFilePath = path.join(uploadsDir, docFileName);

      const uniquePdf = fileBuffer.toString("latin1").replace(
        "%%EOF",
        `% Document: ${doc.originalName} [${doc.documentType}]\nstartxref\n665\n%%EOF`
      );
      await fs.writeFile(docFilePath, uniquePdf, "latin1");
      const docBuf = await fs.readFile(docFilePath);
      const docHash = crypto.createHash("sha256").update(docBuf).digest("hex");

      await prisma.document.create({
        data: {
          applicationId: app.id,
          fileName: docFileName,
          originalName: doc.originalName,
          filePath: docFilePath,
          fileHash: docHash,
          mimeType: "application/pdf",
          fileSize: docBuf.length,
          documentType: doc.documentType,
          extractionStatus: envelope.extractionStatus || "SUCCESS",
          extractedData: envelope as any,
        },
      });
      totalDocsSeeded++;
    }

    totalAppsSeeded++;
    console.log(`  - Created Application ${app.id} (${scenario.documents.length} docs, assigned: ${assignedOfficerName}).`);
  }

  console.log("\n==================================================================");
  console.log(`Seeding complete: ${totalAppsSeeded} Applications, ${totalDocsSeeded} Documents, 3 Authorized Accounts.`);
  console.log("Credentials available for prototype evaluation:");
  console.log("  • Ministry Admin:  admin@aicte.gov.in    / Admin@AICTE2026!");
  console.log("  • Officer 1:       officer1@aicte.gov.in / Officer@AICTE2026! (Rajiv Malhotra)");
  console.log("  • Officer 2:       officer2@aicte.gov.in / Officer@AICTE2026! (Sunita Deshmukh)");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
