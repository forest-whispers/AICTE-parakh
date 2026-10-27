import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { complianceService } from "../src/services/compliance.service.js";
import {
  scenario1Compliant,
  scenario2MissingDocs,
  scenario3UncertainEvidence,
  scenario4IdentityMismatch,
  scenario5LandDeficiencies,
  scenario6ExpiredChronology,
  scenario7InfraDeficit,
  scenario8CompoundIssues,
} from "../src/fixtures/mock-scenarios.fixture.js";

const evalDate = new Date("2026-10-27T00:00:00Z");

describe("Synthetic Application Scrutiny Scenarios (Slice 4 - Baseline Dataset)", () => {
  it("Scenario 1: Evaluates Largely Compliant application to COMPLIANT with 0 deficiencies", async () => {
    const s = scenario1Compliant;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s1-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "COMPLIANT");
    assert.equal(result.deficiencyCount, 0, "Compliant application must have 0 deficiencies");
    assert.equal(result.missingCount, 0, "0 missing documents");
    assert.equal(result.reviewCount, 0, "0 review flags");
    assert.equal(result.passedCount, 24, "All 24 rules passed");
  });

  it("Scenario 2: Evaluates Missing Documents application to MANUAL_REVIEW_REQUIRED with missing counts", async () => {
    const s = scenario2MissingDocs;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s2-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "MANUAL_REVIEW_REQUIRED");
    assert.ok(result.missingCount >= 3, "Missing land, building plan, and fire safety records");
    // Verify specific missing rules
    const missingLand = result.findings.find((f) => f.ruleId === "RULE_LAND_DEED_TENURE");
    assert.ok(missingLand);
    assert.equal(missingLand.outcome, "EVIDENCE_MISSING");

    const missingIntake = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(missingIntake);
    assert.equal(missingIntake.outcome, "INSUFFICIENT_INPUT");
  });

  it("Scenario 3: Evaluates Incomplete / Uncertain Evidence to MANUAL_REVIEW_REQUIRED without false failures", async () => {
    const s = scenario3UncertainEvidence;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s3-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "MANUAL_REVIEW_REQUIRED");
    assert.equal(result.deficiencyCount, 0, "Uncertain evidence must NOT be marked as confirmed deficiency");
    assert.ok(result.reviewCount >= 2, "Uncertain extractions route to manual scrutiny");

    const landUseFinding = result.findings.find((f) => f.ruleId === "RULE_LAND_USE_EDUCATIONAL");
    assert.ok(landUseFinding);
    assert.equal(landUseFinding.outcome, "MANUAL_REVIEW_REQUIRED");

    const infraFinding = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(infraFinding);
    assert.equal(infraFinding.outcome, "EXTRACTION_UNCERTAIN");
  });

  it("Scenario 4: Evaluates Cross-Document Identity Mismatch to DEFICIENCIES_DETECTED", async () => {
    const s = scenario4IdentityMismatch;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s4-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const nameMismatch = result.findings.find((f) => f.ruleId === "RULE_CROSS_SPONSORING_BODY_NAME");
    assert.ok(nameMismatch);
    assert.equal(nameMismatch.outcome, "MISMATCH_DETECTED");
    assert.ok(nameMismatch.details.includes("Sunrise Commercial Holdings"));

    const addrMismatch = result.findings.find((f) => f.ruleId === "RULE_CROSS_CAMPUS_ADDRESS");
    assert.ok(addrMismatch);
    assert.equal(addrMismatch.outcome, "MISMATCH_DETECTED");
  });

  it("Scenario 5: Evaluates Land Deficiencies to DEFICIENCIES_DETECTED across multiple land rules", async () => {
    const s = scenario5LandDeficiencies;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s5-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");

    // Land area < 1.5 ac
    const landAcreage = result.findings.find((f) => f.ruleId === "RULE_LAND_ACREAGE_THRESHOLD");
    assert.ok(landAcreage);
    assert.equal(landAcreage.outcome, "FAIL_DEFICIENCY");

    // Private lease < 30 years
    const leaseTenure = result.findings.find((f) => f.ruleId === "RULE_LAND_DEED_TENURE");
    assert.ok(leaseTenure);
    assert.equal(leaseTenure.outcome, "FAIL_DEFICIENCY");

    // Fragmented 5 plots > 3 plots
    const plotCount = result.findings.find((f) => f.ruleId === "RULE_LAND_PARCELS_ARRANGEMENT");
    assert.ok(plotCount);
    assert.equal(plotCount.outcome, "FAIL_DEFICIENCY");

    // Agricultural restriction
    const landUse = result.findings.find((f) => f.ruleId === "RULE_LAND_USE_EDUCATIONAL");
    assert.ok(landUse);
    assert.equal(landUse.outcome, "FAIL_DEFICIENCY");
  });

  it("Scenario 6: Evaluates Expired Certificates & Chronological Inversions to DEFICIENCIES_DETECTED", async () => {
    const s = scenario6ExpiredChronology;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s6-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");

    // Expired Fire NOC
    const fireFinding = result.findings.find((f) => f.ruleId === "RULE_FIRE_SAFETY_VALIDITY");
    assert.ok(fireFinding);
    assert.equal(fireFinding.outcome, "EXPIRED");

    // Intra-document date inversion
    const intraFinding = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(intraFinding);
    assert.equal(intraFinding.outcome, "FAIL_DEFICIENCY");

    // Sequence inversion (occupancy issued before building plan sanction)
    const chronoFinding = result.findings.find((f) => f.ruleId === "RULE_CHRONOLOGICAL_SANITY");
    assert.ok(chronoFinding);
    assert.equal(chronoFinding.outcome, "FAIL_DEFICIENCY");
  });

  it("Scenario 7: Evaluates Infrastructure Shortfall & FAR Overflow to DEFICIENCIES_DETECTED", async () => {
    const s = scenario7InfraDeficit;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s7-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    const infraFinding = result.findings.find((f) => f.ruleId === "RULE_INFRASTRUCTURE_ADMIN_AMENITIES");
    assert.ok(infraFinding);
    assert.equal(infraFinding.outcome, "FAIL_DEFICIENCY");
    assert.ok(infraFinding.summary.includes("Administrative area shortfall: 450 m² declared vs 750 m² required"));
  });

  it("Scenario 8: Evaluates Compound Multi-Deficiency Application to DEFICIENCIES_DETECTED with multiple concurrent issues", async () => {
    const s = scenario8CompoundIssues;
    const docs = s.documents.map((d, idx) => ({
      id: `doc-s8-${idx}`,
      documentType: d.documentType,
      originalName: d.originalName,
      extractedData: d.extractedData,
    }));

    const result = await complianceService.evaluateDocuments(
      {
        institutionName: s.institutionName,
        programCategory: s.programCategory,
        proposedIntake: s.proposedIntake,
      },
      docs,
      evalDate
    );

    assert.equal(result.overallStatus, "DEFICIENCIES_DETECTED");
    assert.ok(result.deficiencyCount >= 3, "Compound scenario must surface multiple substantive deficiencies");

    // Prohibited acronym
    const nameFinding = result.findings.find((f) => f.ruleId === "RULE_NAME_PROHIBITED_WORDS");
    assert.ok(nameFinding);
    assert.equal(nameFinding.outcome, "FAIL_DEFICIENCY");

    // Funds below threshold & lien
    const fundsFinding = result.findings.find((f) => f.ruleId === "RULE_FUNDS_LIQUID_THRESHOLD");
    assert.ok(fundsFinding);
    assert.equal(fundsFinding.outcome, "FAIL_DEFICIENCY");

    // Cross land area shortfall
    const landCross = result.findings.find((f) => f.ruleId === "RULE_CROSS_LAND_AREA");
    assert.ok(landCross);
    assert.equal(landCross.outcome, "MISMATCH_DETECTED");

    // Carpet area exceeds built-up
    const intraDoc = result.findings.find((f) => f.ruleId === "RULE_INTRA_DOCUMENT_CONSISTENCY");
    assert.ok(intraDoc);
    assert.equal(intraDoc.outcome, "FAIL_DEFICIENCY");
  });
});
