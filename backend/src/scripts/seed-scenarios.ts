/**
 * Database Seeding Script for Synthetic Scenarios (Slice 4)
 * 
 * Populates the development database with 8 distinct synthetic applications,
 * their associated document records, valid storage file references, and mocked
 * VLM extraction outputs.
 * 
 * Rules & Guarantees:
 * - Idempotent: Can be run repeatedly without duplicating records.
 * - Safe: Only modifies applications with predictable prefix "AICTE-DEMO-".
 * - Deterministic: Stops immediately after persisting mocked extraction data.
 *   Does NOT call LLMs, run extraction, or create scrutiny reports.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { allSyntheticScenarios } from "../fixtures/mock-scenarios.fixture.js";

async function main() {
  console.log("==================================================================");
  console.log("PARAKH: Seeding 8 Synthetic Scenarios with Mocked VLM Extractions");
  console.log("==================================================================");

  // 1. Verify or create shared placeholder PDF in uploads directory
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const placeholderFileName = "parakh-demo-placeholder.pdf";
  const placeholderFilePath = path.join(uploadsDir, placeholderFileName);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(placeholderFilePath);
  } catch {
    // If not found, write standard minimal PDF
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

  const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const fileSize = fileBuffer.length;

  console.log(`Using document storage reference: ${placeholderFilePath} (${fileSize} bytes, SHA-256: ${fileHash.substring(0, 12)}...)`);

  // 2. Iterate and seed each of the 8 scenarios
  let totalAppsSeeded = 0;
  let totalDocsSeeded = 0;

  for (const [index, scenario] of allSyntheticScenarios.entries()) {
    console.log(`\n[Scenario ${index + 1}/8] Seeding ${scenario.applicationNumber}: "${scenario.title}"`);

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
      },
    });

    // Create Document records with mocked extraction data
    for (const [dIdx, doc] of scenario.documents.entries()) {
      // Ensure each document in the envelope points to the created DB document ID
      const envelope = {
        ...doc.extractedData,
        documentId: `seed-doc-${index + 1}-${dIdx + 1}`,
      };

      // Create distinct physical PDF file for each document to avoid payload hash collision
      const docFileName = `demo-app${index + 1}-doc${dIdx + 1}.pdf`;
      const docFilePath = path.join(uploadsDir, docFileName);

      // Unique document comment preserves valid PDF while generating distinct SHA-256 hash
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
    console.log(`  - Created Application ${app.id} with ${scenario.documents.length} documents.`);
    console.log(`  - Target Scrutiny Outcome: [${scenario.intendedScrutinyOutcome}]`);
  }

  console.log("\n==================================================================");
  console.log(`Seeding complete: ${totalAppsSeeded} Applications, ${totalDocsSeeded} Documents persisted.`);
  console.log("Mocked extraction data is ready. Scrutiny reports were NOT generated.");
  console.log("Scrutiny can now be triggered independently via POST /api/applications/:id/scrutiny");
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
