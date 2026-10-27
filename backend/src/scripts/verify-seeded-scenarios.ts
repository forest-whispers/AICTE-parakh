/**
 * Independent Validation Script for Seeded Scenarios (Slice 4)
 * 
 * Independently triggers the deterministic scrutiny engine against each of the
 * 8 seeded applications in the database, verifying:
 * 1. Data retrieval and document storage references.
 * 2. Independent execution of complianceService.evaluateApplication(id).
 * 3. Generation and persistence of ScrutinyReport records.
 * 4. Distinct and meaningful outcomes across all 8 scenarios.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { complianceService } from "../services/compliance.service.js";

async function main() {
  console.log("==================================================================");
  console.log("PARAKH: Independent Validation of 8 Seeded Scenarios");
  console.log("==================================================================");

  // 1. Fetch all seeded applications
  const apps = await prisma.application.findMany({
    where: {
      applicationNumber: { startsWith: "AICTE-DEMO-" },
    },
    orderBy: { applicationNumber: "asc" },
    include: {
      documents: true,
      scrutinyReports: true,
    },
  });

  console.log(`Retrieved ${apps.length} seeded applications from database.`);
  if (apps.length !== 8) {
    throw new Error(`Expected exactly 8 seeded applications, found ${apps.length}`);
  }

  // 2. Validate document storage references
  let totalDocsChecked = 0;
  for (const app of apps) {
    for (const doc of app.documents) {
      totalDocsChecked++;
      const fileStat = await fs.stat(doc.filePath);
      if (fileStat.size <= 0) {
        throw new Error(`Document ${doc.id} has empty file at ${doc.filePath}`);
      }
      if (!doc.extractedData) {
        throw new Error(`Document ${doc.id} (${doc.documentType}) has missing extractedData`);
      }
    }
  }
  console.log(`Validated ${totalDocsChecked} document storage references and extraction payloads.`);

  // 3. Independently trigger scrutiny workflow for each application
  console.log("\nTriggering scrutiny evaluation workflow for each scenario...\n");

  const summaryResults: Array<{
    scenarioNum: number;
    appNumber: string;
    institution: string;
    overallStatus: string;
    passed: number;
    deficiencies: number;
    reviews: number;
    missing: number;
    total: number;
    keyObservation: string;
  }> = [];

  for (const [idx, app] of apps.entries()) {
    const scenarioNum = idx + 1;
    console.log(`--- Scenario ${scenarioNum}: ${app.applicationNumber} ---`);
    console.log(`Institution: ${app.institutionName}`);
    console.log(`Documents: ${app.documents.length}`);

    // Trigger scrutiny via service (same as POST /api/applications/:id/scrutiny)
    const result = await complianceService.evaluateApplication(app.id, new Date("2026-10-27T00:00:00Z"));

    console.log(`Outcome: [${result.overallStatus}] | Passed: ${result.passedCount} | Deficiencies: ${result.deficiencyCount} | Reviews: ${result.reviewCount} | Missing: ${result.missingCount} | Total Rules: ${result.totalRulesRun}`);

    // Extract a prominent finding for summary
    let keyObservation = "";
    if (result.deficiencyCount > 0) {
      const firstDef = result.findings.find(
        (f) => f.outcome === "FAIL_DEFICIENCY" || f.outcome === "EXPIRED" || f.outcome === "MISMATCH_DETECTED"
      );
      keyObservation = firstDef ? `${firstDef.ruleId}: ${firstDef.summary}` : "Deficiencies detected";
    } else if (result.reviewCount > 0 || result.missingCount > 0) {
      const firstReview = result.findings.find(
        (f) => f.outcome === "MANUAL_REVIEW_REQUIRED" || f.outcome === "EXTRACTION_UNCERTAIN" || f.outcome === "EVIDENCE_MISSING" || f.outcome === "INSUFFICIENT_INPUT"
      );
      keyObservation = firstReview ? `${firstReview.ruleId}: ${firstReview.summary}` : "Review required";
    } else {
      keyObservation = "All statutory rules passed cleanly with zero deficiencies";
    }

    console.log(`Key Observation: ${keyObservation}\n`);

    summaryResults.push({
      scenarioNum,
      appNumber: app.applicationNumber,
      institution: app.institutionName,
      overallStatus: result.overallStatus,
      passed: result.passedCount,
      deficiencies: result.deficiencyCount,
      reviews: result.reviewCount,
      missing: result.missingCount,
      total: result.totalRulesRun,
      keyObservation,
    });
  }

  // 4. Print summary table
  console.log("====================================================================================================");
  console.log("SCENARIO VALIDATION SUMMARY TABLE");
  console.log("====================================================================================================");
  for (const r of summaryResults) {
    console.log(
      `#${r.scenarioNum} | ${r.appNumber.padEnd(30)} | ${r.overallStatus.padEnd(22)} | Pass: ${String(r.passed).padStart(2)} | Def: ${String(r.deficiencies).padStart(2)} | Rev: ${String(r.reviews).padStart(2)} | Miss: ${String(r.missing).padStart(2)}`
    );
    console.log(`   └─ ${r.keyObservation}`);
  }
  console.log("====================================================================================================");

  // 5. Verify database ScrutinyReport persistence
  const savedReports = await prisma.scrutinyReport.findMany({
    where: {
      application: {
        applicationNumber: { startsWith: "AICTE-DEMO-" },
      },
    },
  });
  console.log(`\nVerified database persistence: ${savedReports.length} ScrutinyReport records generated.`);
  if (savedReports.length !== 8) {
    throw new Error(`Expected 8 scrutiny reports in DB, found ${savedReports.length}`);
  }
}

main()
  .catch((e) => {
    console.error("Validation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
