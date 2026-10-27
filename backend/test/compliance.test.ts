import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  adaptDoc01,
  adaptDoc02,
  adaptDoc03,
  adaptDoc05,
  adaptDoc06,
  adaptDoc07,
  adaptDoc10,
} from "../src/services/extraction-adapter.js";
import { complianceService } from "../src/services/compliance.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load synthetic reference fixture
const fixturePath = path.join(__dirname, "fixtures", "sample-application.json");
const sampleApp = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function getFreshFixture() {
  return JSON.parse(JSON.stringify(sampleApp));
}

describe("Extraction Adapter & Field Normalization", () => {
  it("normalizes Bank Funds amount from INR to Lakhs correctly", () => {
    const rawContainer = {
      amountInInr: {
        state: "PRESENT",
        value: 12500000,
        rawText: "125,00,000",
        pageNumber: 1,
        excerpt: "125,00,000",
      },
      isUnencumbered: { state: "PRESENT", value: true, rawText: "unencumbered" },
    };

    const adapted = adaptDoc10(rawContainer);
    assert.equal(adapted.amountInInr.value, 12500000);
    assert.equal(adapted.amountInLakhsINR.state, "PRESENT");
    assert.equal(adapted.amountInLakhsINR.value, 125);
    assert.equal(adapted.isUnencumbered.value, true);
  });

  it("handles Building Plan flat area fields vs nested summary", () => {
    const rawFlat = {
      adminCarpetAreaSqm: { state: "PRESENT", value: 820 },
      amenitiesCarpetAreaSqm: { state: "PRESENT", value: 560 },
      totalBuiltUpAreaSqm: { state: "PRESENT", value: 8450 },
    };
    const adaptedFlat = adaptDoc06(rawFlat);
    assert.equal(adaptedFlat.adminCarpetAreaSqm.value, 820);
    assert.equal(adaptedFlat.amenitiesCarpetAreaSqm.value, 560);
    assert.equal(adaptedFlat.totalBuiltUpAreaSqm.value, 8450);

    const rawNested = {
      carpetAreaSummary: {
        state: "PRESENT",
        value: { administrativeSqM: 900, amenitiesSqM: 600 },
      },
    };
    const adaptedNested = adaptDoc06(rawNested);
    assert.equal(adaptedNested.adminCarpetAreaSqm.value, 900);
    assert.equal(adaptedNested.amenitiesCarpetAreaSqm.value, 600);
  });

  it("normalizes Land Deed document type and buyer transferee name", () => {
    const rawDeed = {
      documentType: { state: "PRESENT", value: "Sale Deed", rawText: "registered sale deed" },
      buyerTransferee: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
      khasraNumbers: { state: "PRESENT", value: "114/2, 115/1 and 116/3" },
      landAreaAcres: { state: "PRESENT", value: 12.4 },
    };
    const adapted = adaptDoc03(rawDeed);
    assert.equal(adapted.documentType.value, "Sale Deed");
    assert.equal(adapted.buyerTransferee.value, "Sahyog Technical Education Trust");
    assert.equal(adapted.khasraNumbers.value, "114/2, 115/1 and 116/3");
    assert.equal(adapted.landAreaAcres.value, 12.4);
  });

  it("normalizes Land Use permitted use and applicant name", () => {
    const rawLuc = {
      permittedUse: { state: "PRESENT", value: "educational and institutional purposes" },
      applicantName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
      orderNumber: { state: "PRESENT", value: "LUC/SEH/2021/0196" },
    };
    const adapted = adaptDoc05(rawLuc);
    assert.equal(adapted.permittedUse.value, "educational and institutional purposes");
    assert.equal(adapted.applicantName.value, "Sahyog Technical Education Trust");
    assert.equal(adapted.orderNumber.value, "LUC/SEH/2021/0196");
  });

  it("normalizes Occupancy certificate type and status", () => {
    const rawOcc = {
      occupancyType: { state: "PRESENT", value: "permanent" },
      certificateNumber: { state: "PRESENT", value: "OCC/SEH/2023/0314" },
    };
    const adapted = adaptDoc07(rawOcc);
    assert.equal(adapted.occupancyType.value, "permanent");
    assert.equal(adapted.certificateNumber.value, "OCC/SEH/2023/0314");
  });

  it("normalizes Registration trust / society entity type", () => {
    const rawReg = {
      entityType: { state: "PRESENT", value: "Public Charitable Trust" },
      trustSocietyName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
    };
    const adapted = adaptDoc01(rawReg);
    assert.equal(adapted.entityType.value, "Public Charitable Trust");
    assert.equal(adapted.trustSocietyName.value, "Sahyog Technical Education Trust");
  });

  it("normalizes Resolution format 3 details", () => {
    const rawRes = {
      proposedInstitutionName: { state: "PRESENT", value: "Sahyog Institute of Engineering and Technology" },
      proposedCoursesIntake: { state: "PRESENT", value: "B.Tech in CSE, intake of 180 students" },
      authorizedSignatories: { state: "PRESENT", value: "Chairperson and Secretary" },
      trustSocietyName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
    };
    const adapted = adaptDoc02(rawRes);
    assert.equal(adapted.proposedInstitutionName.value, "Sahyog Institute of Engineering and Technology");
    assert.equal(adapted.authorizedSignatories.value, "Chairperson and Secretary");
  });
});

describe("Deterministic Scrutiny Engine - Compliant Application", () => {
  it("evaluates a fully compliant 12-document application as COMPLIANT with 0 deficiencies", async () => {
    const fixture = getFreshFixture();
    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "COMPLIANT");
    assert.equal(result.deficiencyCount, 0, "Should have 0 deficiencies");
    assert.equal(result.reviewCount, 0, "Should have 0 manual reviews");
    assert.equal(result.missingCount, 0, "Should have 0 missing evidence");
    assert.equal(result.passedCount, 16, "Should pass all 16 deterministic checks");
    assert.equal(result.totalRulesRun, 16);
  });
});

describe("Deterministic Scrutiny Engine - Negative & Edge Cases", () => {
  it("fails with FAIL_DEFICIENCY when liquid funds are below statutory threshold (₹50 Lakhs vs ₹100 Lakhs for Engineering)", async () => {
    const fixture = getFreshFixture();
    const doc10 = fixture.documents.find((d: any) => d.documentType === "DOC_10_BANK_FUNDS");
    assert.ok(doc10);

    // Modify amount to 50 Lakhs (5,000,000 INR)
    doc10.extractedData.doc10BankFunds.amountInInr.value = 5000000;
    doc10.extractedData.doc10BankFunds.amountInInr.rawText = "50,00,000";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    assert.equal(result.deficiencyCount, 1);
    const finding = result.findings.find((f) => f.ruleId === "RULE_FUNDS_LIQUID_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("Liquid funds shortfall: ₹50 Lakhs declared vs. ₹100 Lakhs required"));
  });

  it("fails with FAIL_DEFICIENCY when liquid bank funds are encumbered or under lien", async () => {
    const fixture = getFreshFixture();
    const doc10 = fixture.documents.find((d: any) => d.documentType === "DOC_10_BANK_FUNDS");
    assert.ok(doc10);

    doc10.extractedData.doc10BankFunds.isUnencumbered.value = false;
    doc10.extractedData.doc10BankFunds.isUnencumbered.rawText = "Subject to bank lien";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_FUNDS_LIQUID_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("encumbered"));
  });

  it("fails with FAIL_DEFICIENCY when proposed institution name contains prohibited words/acronyms", async () => {
    const fixture = getFreshFixture();

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: "Indian National Institute of Technology",
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_NAME_PROHIBITED_WORDS");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("prohibited terms"));
  });

  it("fails with EXPIRED when fire safety certificate validity date is in the past", async () => {
    const fixture = getFreshFixture();
    const doc09 = fixture.documents.find((d: any) => d.documentType === "DOC_09_FIRE_SAFETY");
    assert.ok(doc09);

    doc09.extractedData.doc09FireSafety.expiryDate.value = "2022-01-01";
    doc09.extractedData.doc09FireSafety.expiryDate.rawText = "01-01-2022";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_FIRE_SAFETY_VALIDITY");
    assert.ok(finding);
    assert.equal(finding.outcome, "EXPIRED");
  });

  it("fails with MISMATCH_DETECTED when cross-document sponsoring body name diverges", async () => {
    const fixture = getFreshFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    doc03.extractedData.doc03LandDeed.buyerTransferee.value = "Completely Unrelated Trust";
    doc03.extractedData.doc03LandDeed.buyerTransferee.rawText = "Completely Unrelated Trust";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_CROSS_SPONSORING_BODY_NAME");
    assert.ok(finding);
    assert.equal(finding.outcome, "MISMATCH_DETECTED");
  });

  it("fails with FAIL_DEFICIENCY when private lease duration is less than 30 years", async () => {
    const fixture = getFreshFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    doc03.extractedData.doc03LandDeed.documentType.value = "Lease Deed";
    doc03.extractedData.doc03LandDeed.leaseTenureYears = {
      state: "PRESENT",
      value: 15,
      rawText: "15 years",
      pageNumber: 1,
      excerpt: "15 years",
    };

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_DEED_TENURE");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("Lease tenure deficiency"));
  });

  it("fails with FAIL_DEFICIENCY when land is fragmented across more than 3 parcels", async () => {
    const fixture = getFreshFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    doc03.extractedData.doc03LandDeed.khasraNumbers.value = "101, 102, 103, 104, 105";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_PARCELS_ARRANGEMENT");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("plots (maximum 3 plots permitted)"));
  });

  it("fails with FAIL_DEFICIENCY when land use conversion is not educational", async () => {
    const fixture = getFreshFixture();
    const doc05 = fixture.documents.find((d: any) => d.documentType === "DOC_05_LAND_USE");
    assert.ok(doc05);

    doc05.extractedData.doc05LandUse.permittedUse.value = "agricultural farming only";

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_USE_EDUCATIONAL");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("restricts or does not permit educational use"));
  });

  it("fails with FAIL_DEFICIENCY when administrative carpet area is deficient", async () => {
    const fixture = getFreshFixture();
    const doc06 = fixture.documents.find((d: any) => d.documentType === "DOC_06_BUILDING_PLAN");
    assert.ok(doc06);

    doc06.extractedData.doc06BuildingPlan.adminCarpetAreaSqm.value = 400; // below 750 sqm

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      fixture.documents,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("Administrative area shortfall: 400 m² declared vs 750 m² required"));
  });

  it("flags EVIDENCE_MISSING when mandatory document DOC_03 is omitted", async () => {
    const fixture = getFreshFixture();
    const filteredDocs = fixture.documents.filter((d: any) => d.documentType !== "DOC_03_LAND_DEED");

    const result = await complianceService.evaluateDocuments(
      {
        id: fixture.id,
        institutionName: fixture.institutionName,
        programCategory: fixture.programCategory,
        proposedIntake: fixture.proposedIntake,
      },
      filteredDocs,
      new Date("2026-10-27T00:00:00Z")
    );

    assert.equal(result.overallStatus, "MANUAL_REVIEW_REQUIRED");
    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_DEED_TENURE");
    assert.ok(finding);
    assert.equal(finding.outcome, "EVIDENCE_MISSING");
  });
});
