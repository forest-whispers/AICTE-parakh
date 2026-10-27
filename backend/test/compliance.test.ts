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
import { sanitizeJsonString } from "../src/services/vlm.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load fixtures
const sampleAppPath = path.join(__dirname, "fixtures", "sample-application.json");
const sampleApp = JSON.parse(fs.readFileSync(sampleAppPath, "utf8"));

const resultIIIPath = path.join(__dirname, "fixtures", "result-iii-application.json");
const resultIIIApp = JSON.parse(fs.readFileSync(resultIIIPath, "utf8"));

function getFreshSampleFixture() {
  return JSON.parse(JSON.stringify(sampleApp));
}

function getFreshResultIIIFixture() {
  return JSON.parse(JSON.stringify(resultIIIApp));
}

describe("Extraction Adapter & Field Normalization", () => {
  it("normalizes Bank Funds amount from principalAmountRupees (result-III) to Lakhs", () => {
    const rawContainer = {
      principalAmountRupees: {
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

  it("normalizes Bank Funds amount from amountInInr (result-I) to Lakhs", () => {
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

  it("handles Building Plan administrativeCarpetAreaSqM (result-III) with uppercase SqM", () => {
    const rawResultIII = {
      administrativeCarpetAreaSqM: { state: "PRESENT", value: 820 },
      amenitiesCarpetAreaSqM: { state: "PRESENT", value: 560 },
      totalSanctionedBuiltUpAreaSqm: { state: "PRESENT", value: 8450 },
    };
    const adapted = adaptDoc06(rawResultIII);
    assert.equal(adapted.adminCarpetAreaSqm.value, 820);
    assert.equal(adapted.amenitiesCarpetAreaSqm.value, 560);
    assert.equal(adapted.totalBuiltUpAreaSqm.value, 8450);
  });

  it("handles Building Plan adminCarpetAreaSqm (result-I) flat area fields vs nested summary", () => {
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

  it("normalizes Land Deed document type, transferee, and registration reference", () => {
    const rawDeed = {
      deedType: { state: "PRESENT", value: "Sale Deed", rawText: "registered sale deed" },
      transfereeName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
      khasraNumbers: { state: "PRESENT", value: "114/2, 115/1 and 116/3" },
      totalAreaAcres: { state: "PRESENT", value: 12.4 },
    };
    const adapted = adaptDoc03(rawDeed);
    assert.equal(adapted.documentType.value, "Sale Deed");
    assert.equal(adapted.buyerTransferee.value, "Sahyog Technical Education Trust");
    assert.equal(adapted.khasraNumbers.value, "114/2, 115/1 and 116/3");
    assert.equal(adapted.landAreaAcres.value, 12.4);
  });

  it("normalizes Registration applicantType (result-III) vs entityType (result-I)", () => {
    const rawRegResultIII = {
      applicantType: { state: "PRESENT", value: "Public Charitable Trust" },
      applicantName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
    };
    const adapted = adaptDoc01(rawRegResultIII);
    assert.equal(adapted.entityType.value, "Public Charitable Trust");
    assert.equal(adapted.trustSocietyName.value, "Sahyog Technical Education Trust");
  });

  it("normalizes Land Use orderReferenceNumber (result-III) and permittedUse", () => {
    const rawLuc = {
      permittedUse: { state: "PRESENT", value: "educational and institutional purposes" },
      applicantName: { state: "PRESENT", value: "Sahyog Technical Education Trust" },
      orderReferenceNumber: { state: "PRESENT", value: "LUC/SEH/2021/0196" },
    };
    const adapted = adaptDoc05(rawLuc);
    assert.equal(adapted.permittedUse.value, "educational and institutional purposes");
    assert.equal(adapted.applicantName.value, "Sahyog Technical Education Trust");
    assert.equal(adapted.orderNumber.value, "LUC/SEH/2021/0196");
  });

  it("normalizes Occupancy occupancyStatus (result-III) and certificateReferenceNumber", () => {
    const rawOcc = {
      occupancyStatus: { state: "PRESENT", value: "permanent" },
      certificateReferenceNumber: { state: "PRESENT", value: "OCC/SEH/2023/0314" },
    };
    const adapted = adaptDoc07(rawOcc);
    assert.equal(adapted.occupancyType.value, "permanent");
    assert.equal(adapted.certificateNumber.value, "OCC/SEH/2023/0314");
  });
});

describe("VLM Response JSON Sanitization", () => {
  it("escapes unescaped control characters (newlines, tabs) inside string literals", () => {
    const badJson = '{\n  "excerpt": "Paragraph 1' + String.fromCharCode(10) + 'Paragraph 2\\t' + String.fromCharCode(9) + 'Column"\n}';
    assert.throws(() => JSON.parse(badJson), /Bad control character/);

    const sanitized = sanitizeJsonString(badJson);
    const parsed: any = JSON.parse(sanitized);
    assert.equal(parsed.excerpt, "Paragraph 1\nParagraph 2\t\tColumn");
  });

  it("strips markdown code blocks around JSON", () => {
    const fenced = '```json\n{\n  "status": "SUCCESS"\n}\n```';
    const sanitized = sanitizeJsonString(fenced);
    const parsed: any = JSON.parse(sanitized);
    assert.equal(parsed.status, "SUCCESS");
  });

  it("preserves escaped quotes and backslashes properly", () => {
    const withEscapes = '{\n  "text": "Name \\"with quotes\\" and C:\\\\path"\n}';
    const sanitized = sanitizeJsonString(withEscapes);
    const parsed: any = JSON.parse(sanitized);
    assert.equal(parsed.text, 'Name "with quotes" and C:\\path');
  });
});

describe("Deterministic Scrutiny Engine - result-III.pdf Baseline Audit", () => {
  it("accurately evaluates result-III records: Bank Funds PASS, Areas PASS, Contiguity REVIEW, Resolution DEFICIENCY", async () => {
    const fixture = getFreshResultIIIFixture();
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

    // 1. Bank funds: 12500000 INR -> 125 Lakhs >= 100 Lakhs, unencumbered -> PASS
    const fundsFinding = result.findings.find((f) => f.ruleId === "RULE_FUNDS_LIQUID_THRESHOLD");
    assert.ok(fundsFinding);
    assert.equal(fundsFinding.outcome, "PASS", "Bank funds should PASS with ₹125 Lakhs unencumbered");
    assert.ok(fundsFinding.summary.includes("₹125 Lakhs"));

    // 2. Areas: 820 admin >= 750, 560 amenities >= 500 -> PASS
    const areaFinding = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(areaFinding);
    assert.equal(areaFinding.outcome, "PASS", "Areas should PASS with 820 m² admin and 560 m² amenities");
    assert.ok(areaFinding.summary.includes("820 m²"));

    // 3. Contiguity: 3 parcels (114/2, 115/1, 116/3) <= 3, but contiguity requires verification -> MANUAL_REVIEW_REQUIRED
    const landFinding = result.findings.find((f) => f.ruleId === "RULE_LAND_PARCELS_ARRANGEMENT");
    assert.ok(landFinding);
    assert.equal(landFinding.outcome, "MANUAL_REVIEW_REQUIRED", "3 parcels alone cannot prove physical contiguity");
    assert.ok(landFinding.summary.includes("physical contiguity requires verification"));

    // 4. Resolution: missing authorizedSignatories and detailed course commitments -> FAIL_DEFICIENCY
    const resFinding = result.findings.find((f) => f.ruleId === "RULE_APPLICANT_RESOLUTION_COMMITMENT");
    assert.ok(resFinding);
    assert.equal(resFinding.outcome, "FAIL_DEFICIENCY", "Must keep deficiency when required clauses are missing");
    assert.ok(resFinding.details.includes("Missing/Deficient"));

    // 5. Non-profit governance: applicantType "Public Charitable Trust" -> PASS
    const govFinding = result.findings.find((f) => f.ruleId === "RULE_NON_PROFIT_GOVERNANCE");
    assert.ok(govFinding);
    assert.equal(govFinding.outcome, "PASS", "Applicant type Public Charitable Trust satisfies governance");

    // 6. Minimum Land Acreage (12.4 acres >= 7.5 max statutory) -> PASS
    const landAcreFinding = result.findings.find((f) => f.ruleId === "RULE_LAND_ACREAGE_THRESHOLD");
    assert.ok(landAcreFinding);
    assert.equal(landAcreFinding.outcome, "PASS", "Land acreage >= 7.5 acres must pass across all location categories");

    // 7. Cross-Document Land Area (DOC-03 12.4 ac == DOC-05 12.4 ac) -> PASS
    const crossLandFinding = result.findings.find((f) => f.ruleId === "RULE_CROSS_LAND_AREA");
    assert.ok(crossLandFinding);
    assert.equal(crossLandFinding.outcome, "PASS", "Deed area matches conversion order area");

    // 8. Chronological Sanity -> PASS
    const chronoFinding = result.findings.find((f) => f.ruleId === "RULE_CHRONOLOGICAL_SANITY");
    assert.ok(chronoFinding);
    assert.equal(chronoFinding.outcome, "PASS", "All dates must follow valid sequence");

    // 9. Intra-Document Consistency -> PASS
    const intraFinding = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(intraFinding);
    assert.equal(intraFinding.outcome, "PASS", "Internal validity and geometric areas are consistent");

    // Summary counts
    assert.equal(result.totalRulesRun, 20, "Total 20 deterministic rules evaluated");
    assert.equal(result.deficiencyCount, 1, "Exactly 1 deficiency (Resolution)");
    assert.equal(result.reviewCount, 1, "Exactly 1 review (Land physical contiguity)");
    assert.equal(result.missingCount, 0, "0 missing documents");
    assert.equal(result.passedCount, 18, "18 rules passed");
    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
  });
});

describe("Deterministic Scrutiny Engine - Single Unified Parcel vs Multi-Parcel Contiguity", () => {
  it("PASSES contiguity when land is on a single unified parcel", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    // Single parcel
    doc03.extractedData.doc03LandDeed.khasraNumbers.value = "114/2";

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

    const landFinding = result.findings.find((f) => f.ruleId === "RULE_LAND_PARCELS_ARRANGEMENT");
    assert.ok(landFinding);
    assert.equal(landFinding.outcome, "PASS");
    assert.ok(landFinding.summary.includes("single unified contiguous parcel"));
  });

  it("returns MANUAL_REVIEW_REQUIRED when land comprises 3 plots (contiguity unproven by parcel count)", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    doc03.extractedData.doc03LandDeed.khasraNumbers.value = "114/2, 115/1 and 116/3";

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

    const landFinding = result.findings.find((f) => f.ruleId === "RULE_LAND_PARCELS_ARRANGEMENT");
    assert.ok(landFinding);
    assert.equal(landFinding.outcome, "MANUAL_REVIEW_REQUIRED");
    assert.ok(landFinding.summary.includes("within limit <= 3"));
    assert.ok(landFinding.details.includes("cannot be established from parcel numbers alone"));
  });
});

describe("Deterministic Scrutiny Engine - Negative & Edge Cases", () => {
  it("fails with FAIL_DEFICIENCY when liquid funds are below statutory threshold (₹50 Lakhs vs ₹100 Lakhs for Engineering)", async () => {
    const fixture = getFreshSampleFixture();
    const doc10 = fixture.documents.find((d: any) => d.documentType === "DOC_10_BANK_FUNDS");
    assert.ok(doc10);

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
    const finding = result.findings.find((f) => f.ruleId === "RULE_FUNDS_LIQUID_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("Liquid funds shortfall: ₹50 Lakhs declared vs. ₹100 Lakhs required"));
  });

  it("fails with FAIL_DEFICIENCY when liquid bank funds are encumbered or under lien", async () => {
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();

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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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
    const fixture = getFreshSampleFixture();
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

describe("Deterministic Scrutiny Engine - Minimum Statutory Land Acreage (APH Table 1.1)", () => {
  it("PASSES when land area is >= 7.5 acres across all location categories", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 8.5;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_ACREAGE_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "PASS");
    assert.ok(finding.summary.includes("8.5 acres satisfies the maximum AICTE requirement"));
  });

  it("fails with FAIL_DEFICIENCY when land area is below absolute statutory minimum (1.5 acres)", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 1.2;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_ACREAGE_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("below the absolute minimum statutory requirement"));
  });

  it("returns MANUAL_REVIEW_REQUIRED when land area (3.5 ac) requires location classification check", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 3.5;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_LAND_ACREAGE_THRESHOLD");
    assert.ok(finding);
    assert.equal(finding.outcome, "MANUAL_REVIEW_REQUIRED");
    assert.ok(finding.summary.includes("requires location classification verification"));
  });
});

describe("Deterministic Scrutiny Engine - Cross-Document Land Area Alignment (DOC-03 vs DOC-05)", () => {
  it("PASSES when deed area and conversion order area are aligned within tolerance", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    const doc05 = fixture.documents.find((d: any) => d.documentType === "DOC_05_LAND_USE");
    assert.ok(doc03 && doc05);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 12.4;
    doc05.extractedData.doc05LandUse.landAreaAcres.value = 12.4;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CROSS_LAND_AREA");
    assert.ok(finding);
    assert.equal(finding.outcome, "PASS");
  });

  it("detects MISMATCH_DETECTED when converted land area is substantially less than deed area", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    const doc05 = fixture.documents.find((d: any) => d.documentType === "DOC_05_LAND_USE");
    assert.ok(doc03 && doc05);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 12.4;
    doc05.extractedData.doc05LandUse.landAreaAcres.value = 2.0; // only 2 acres converted out of 12.4

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CROSS_LAND_AREA");
    assert.ok(finding);
    assert.equal(finding.outcome, "MISMATCH_DETECTED");
    assert.ok(finding.summary.includes("substantially lower than title deed area"));
  });

  it("detects MISMATCH_DETECTED when converted land area exceeds registered title deed area", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    const doc05 = fixture.documents.find((d: any) => d.documentType === "DOC_05_LAND_USE");
    assert.ok(doc03 && doc05);
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 10.0;
    doc05.extractedData.doc05LandUse.landAreaAcres.value = 15.0; // 15 acres converted vs 10 deeded

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CROSS_LAND_AREA");
    assert.ok(finding);
    assert.equal(finding.outcome, "MISMATCH_DETECTED");
    assert.ok(finding.summary.includes("exceeds registered deed title area"));
  });
});

describe("Deterministic Scrutiny Engine - Chronological Sanity & Milestone Sequence", () => {
  it("fails with FAIL_DEFICIENCY when document contains a future-dated record", async () => {
    const fixture = getFreshSampleFixture();
    const doc09 = fixture.documents.find((d: any) => d.documentType === "DOC_09_FIRE_SAFETY");
    assert.ok(doc09);
    doc09.extractedData.doc09FireSafety.issueDate.value = "2029-01-15"; // future date relative to 2026

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CHRONOLOGICAL_SANITY");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.details.includes("dated in the future"));
  });

  it("fails with FAIL_DEFICIENCY when land deed registration predates trust incorporation", async () => {
    const fixture = getFreshSampleFixture();
    const doc01 = fixture.documents.find((d: any) => d.documentType === "DOC_01_REGISTRATION");
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc01 && doc03);

    // Trust formed in 2022, but deed purportedly registered in 2020
    doc01.extractedData.doc01Registration.registrationDate.value = "2022-05-10";
    doc03.extractedData.doc03LandDeed.registrationDate.value = "2020-03-15";

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CHRONOLOGICAL_SANITY");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.details.includes("prior to sponsoring body registration"));
  });

  it("fails with FAIL_DEFICIENCY when building occupancy predates building plan sanction", async () => {
    const fixture = getFreshSampleFixture();
    const doc06 = fixture.documents.find((d: any) => d.documentType === "DOC_06_BUILDING_PLAN");
    const doc07 = fixture.documents.find((d: any) => d.documentType === "DOC_07_OCCUPANCY");
    assert.ok(doc06 && doc07);

    // Occupancy issued in 2022, but plan sanctioned later in 2023
    doc06.extractedData.doc06BuildingPlan.sanctionDate.value = "2023-08-01";
    doc07.extractedData.doc07Occupancy.issueDate.value = "2022-04-10";

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_CHRONOLOGICAL_SANITY");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.details.includes("prior to Building Plan Sanction"));
  });
});

describe("Deterministic Scrutiny Engine - Intra-Document & Cross-Page Logical Consistency", () => {
  it("fails with FAIL_DEFICIENCY when document expiry date is before issue date", async () => {
    const fixture = getFreshSampleFixture();
    const doc09 = fixture.documents.find((d: any) => d.documentType === "DOC_09_FIRE_SAFETY");
    assert.ok(doc09);

    // Issue date 2026-06-01 but valid until 2025-06-01
    doc09.extractedData.doc09FireSafety.issueDate.value = "2026-06-01";
    doc09.extractedData.doc09FireSafety.expiryDate = { state: "PRESENT", value: "2025-06-01", rawText: "2025-06-01" };
    doc09.extractedData.doc09FireSafety.validUntilDate = { state: "PRESENT", value: "2025-06-01", rawText: "2025-06-01" };

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.details.includes("is on or before issueDate"));
  });

  it("detects MISMATCH_DETECTED when bank deposit claims unencumbered but lien statement indicates active pledge", async () => {
    const fixture = getFreshSampleFixture();
    const doc10 = fixture.documents.find((d: any) => d.documentType === "DOC_10_BANK_FUNDS");
    assert.ok(doc10);

    doc10.extractedData.doc10BankFunds.isUnencumbered.value = true;
    doc10.extractedData.doc10BankFunds.lienStatement = {
      state: "PRESENT",
      value: "FDR is pledged under lien to State Construction Corporation",
      rawText: "pledged under lien",
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

    const finding = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(finding);
    assert.equal(finding.outcome, "MISMATCH_DETECTED");
    assert.ok(finding.details.includes("contradicts this"));
  });

  it("fails with FAIL_DEFICIENCY when carpet area sum exceeds total sanctioned built-up area", async () => {
    const fixture = getFreshSampleFixture();
    const doc06 = fixture.documents.find((d: any) => d.documentType === "DOC_06_BUILDING_PLAN");
    assert.ok(doc06);

    // Admin + Amenities = 6000 + 5000 = 11000 sqm > 10000 sqm total built-up
    doc06.extractedData.doc06BuildingPlan.adminCarpetAreaSqm.value = 6000;
    doc06.extractedData.doc06BuildingPlan.amenitiesCarpetAreaSqm.value = 5000;
    doc06.extractedData.doc06BuildingPlan.totalBuiltUpAreaSqm.value = 10000;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.details.includes("Carpet area cannot exceed gross built-up area"));
  });
});

describe("Deterministic Scrutiny Engine - FAR / FSI Development Limits Check", () => {
  it("fails with FAIL_DEFICIENCY when total built-up area exceeds approved FAR capacity on site", async () => {
    const fixture = getFreshSampleFixture();
    const doc03 = fixture.documents.find((d: any) => d.documentType === "DOC_03_LAND_DEED");
    const doc06 = fixture.documents.find((d: any) => d.documentType === "DOC_06_BUILDING_PLAN");
    assert.ok(doc03 && doc06);

    // 2.0 acres = 8093.72 sqm. At FAR 1.5, max built-up is ~12,140 sqm.
    // Setting declared built-up area to 25,000 sqm (> 2x permissible FAR capacity)
    doc03.extractedData.doc03LandDeed.landAreaAcres.value = 2.0;
    doc06.extractedData.doc06BuildingPlan.fsiFarRatio = { state: "PRESENT", value: 1.5, rawText: "1.5" };
    doc06.extractedData.doc06BuildingPlan.farFsi = { state: "PRESENT", value: 1.5, rawText: "1.5" };
    doc06.extractedData.doc06BuildingPlan.totalBuiltUpAreaSqm.value = 25000;

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

    const finding = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(finding);
    assert.equal(finding.outcome, "FAIL_DEFICIENCY");
    assert.ok(finding.summary.includes("exceeds permissible FSI/FAR capacity"));
  });
});
