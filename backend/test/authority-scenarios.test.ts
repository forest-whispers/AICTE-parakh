import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scenario1Compliant,
  scenario4IdentityMismatch,
  scenario6ExpiredChronology,
  scenario8CompoundIssues,
} from "../src/fixtures/mock-scenarios.fixture.js";
import { verifySocietyRegistrar } from "../src/services/authority-adapters/society-registrar.adapter.js";
import { verifyLandRevenueRecord } from "../src/services/authority-adapters/revenue-records.adapter.js";
import { verifyFireServices } from "../src/services/authority-adapters/fire-services.adapter.js";
import { verifyArchitectCouncil } from "../src/services/authority-adapters/architect-council.adapter.js";
import { verifyBankConfirmation } from "../src/services/authority-adapters/bank-confirmation.adapter.js";

describe("Slice 4B: Authority Verification across Synthetic Scenarios", () => {
  it("Scenario 1 (Compliant): Reconciles all 6 statutory authorities to VERIFIED_SIMULATED with zero discrepancies", () => {
    const docs = scenario1Compliant.documents;

    const doc01 = docs.find((d) => d.documentType === "DOC_01_REGISTRATION");
    const doc03 = docs.find((d) => d.documentType === "DOC_03_LAND_DEED");
    const doc05 = docs.find((d) => d.documentType === "DOC_05_LAND_USE");
    const doc06 = docs.find((d) => d.documentType === "DOC_06_BUILDING_PLAN");
    const doc09 = docs.find((d) => d.documentType === "DOC_09_FIRE_SAFETY");
    const doc10 = docs.find((d) => d.documentType === "DOC_10_BANK_FUNDS");

    assert.ok(doc01 && doc03 && doc05 && doc06 && doc09 && doc10);

    const r01 = verifySocietyRegistrar(doc01);
    assert.equal(r01.status, "VERIFIED_SIMULATED");
    assert.equal(r01.discrepancies.length, 0);

    const r03 = verifyLandRevenueRecord(doc03);
    assert.equal(r03.status, "VERIFIED_SIMULATED");
    assert.equal(r03.discrepancies.length, 0);

    const r05 = verifyLandRevenueRecord(doc05);
    assert.equal(r05.status, "VERIFIED_SIMULATED");
    assert.equal(r05.discrepancies.length, 0);

    const r06 = verifyArchitectCouncil(doc06);
    assert.equal(r06.status, "VERIFIED_SIMULATED");
    assert.equal(r06.discrepancies.length, 0);

    const r09 = verifyFireServices(doc09);
    assert.equal(r09.status, "VERIFIED_SIMULATED");
    assert.equal(r09.discrepancies.length, 0);

    const r10 = verifyBankConfirmation(doc10);
    assert.equal(r10.status, "VERIFIED_SIMULATED");
    assert.equal(r10.discrepancies.length, 0);
  });

  it("Scenario 6 (Expired Fire NOC): Authority verification detects EXPIRED_AT_SOURCE for statutory Fire NOC", () => {
    const docs = scenario6ExpiredChronology.documents;
    const doc09 = docs.find((d) => d.documentType === "DOC_09_FIRE_SAFETY");
    assert.ok(doc09);

    const r09 = verifyFireServices(doc09);
    assert.equal(r09.status, "EXPIRED_AT_SOURCE");
    assert.ok(r09.discrepancies.some((d) => d.field === "status"));
    assert.ok(r09.summary.includes("EXPIRED at source"));
  });

  it("Scenario 4 (Identity Mismatch): Authority verification detects MISMATCH_DETECTED against Land Revenue records", () => {
    const docs = scenario4IdentityMismatch.documents;
    const doc03 = docs.find((d) => d.documentType === "DOC_03_LAND_DEED");
    assert.ok(doc03);

    // In Scenario 4, the document claims 'Sunrise Commercial Holdings Private Limited' as transferee, but Bhulekh registered title holder is 'Zenith Welfare & Educational Foundation'
    const r03 = verifyLandRevenueRecord(doc03);
    assert.equal(r03.status, "MISMATCH_DETECTED");
    assert.ok(r03.discrepancies.some((d) => d.field === "transfereeLesseeName"));
  });

  it("Scenario 8 (Encumbered Funds): Bank branch inquiry detects active lien on mandatory deposit", () => {
    const docs = scenario8CompoundIssues.documents;
    const doc10 = docs.find((d) => d.documentType === "DOC_10_BANK_FUNDS");
    assert.ok(doc10);

    const r10 = verifyBankConfirmation(doc10);
    assert.equal(r10.status, "MISMATCH_DETECTED");
    assert.ok(r10.discrepancies.some((d) => d.field === "isUnencumbered"));
    assert.ok(r10.summary.includes("Active lien/charge detected"));
  });
});
