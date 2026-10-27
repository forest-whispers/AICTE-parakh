import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifySocietyRegistrar } from "../src/services/authority-adapters/society-registrar.adapter.js";
import { verifyLandRevenueRecord } from "../src/services/authority-adapters/revenue-records.adapter.js";
import { verifyFireServices } from "../src/services/authority-adapters/fire-services.adapter.js";
import { verifyArchitectCouncil } from "../src/services/authority-adapters/architect-council.adapter.js";
import { verifyBankConfirmation } from "../src/services/authority-adapters/bank-confirmation.adapter.js";

describe("Slice 4B: Authority Verification Adapters", () => {
  describe("1. Society Registrar Adapter", () => {
    it("should return VERIFIED_SIMULATED when trust registration matches official records", () => {
      const mockDoc = {
        id: "doc-01",
        documentType: "DOC_01_REGISTRATION",
        extractedData: {
          doc01Registration: {
            registrationNumber: { value: "REG/BPL/2015/04882" },
            applicantLegalName: { value: "Vidyapeeth Educational Trust" },
            entityType: { value: "Public Charitable Trust" },
            registrationDate: { value: "2015-08-10" },
            registeredAddress: { value: "Plot 12, Arera Hills, Bhopal, Madhya Pradesh 462011" },
            hasNonProfitClause: { value: true },
          },
        },
      };

      const result = verifySocietyRegistrar(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.authorityCategory, "SOCIETY_REGISTRAR");
      assert.equal(result.verificationMode, "SIMULATED_REGISTRY");
      assert.equal(result.discrepancies.length, 0);
      assert.ok(result.authoritativeFields !== null);
      assert.ok(result.summary.includes("Verified in simulated Registrar database"));
    });

    it("should return MISMATCH_DETECTED when applicant name diverges from registrar record", () => {
      const mockDoc = {
        id: "doc-01-mismatch",
        documentType: "DOC_01_REGISTRATION",
        extractedData: {
          doc01Registration: {
            registrationNumber: { value: "REG/IND/2016/0991" },
            applicantLegalName: { value: "Sarvodaya Charitable Society" }, // differs from Sarvodaya Shiksha Parishad
            hasNonProfitClause: { value: true },
          },
        },
      };

      const result = verifySocietyRegistrar(mockDoc);
      assert.equal(result.status, "MISMATCH_DETECTED");
      assert.ok(result.discrepancies.some((d) => d.field === "applicantLegalName"));
    });

    it("should return RECORD_NOT_FOUND when registration is absent from mock registry", () => {
      const mockDoc = {
        id: "doc-01-unknown",
        documentType: "DOC_01_REGISTRATION",
        extractedData: {
          doc01Registration: {
            registrationNumber: { value: "REG/UNKNOWN/99999" },
            applicantLegalName: { value: "Fictional Foundation" },
          },
        },
      };

      const result = verifySocietyRegistrar(mockDoc);
      assert.equal(result.status, "RECORD_NOT_FOUND");
      assert.ok(result.summary.includes("does not constitute conclusive legal proof"));
    });

    it("should return FORMAT_INVALID when registration number is missing", () => {
      const mockDoc = {
        id: "doc-01-missing",
        documentType: "DOC_01_REGISTRATION",
        extractedData: {
          doc01Registration: {
            registrationNumber: { value: null },
          },
        },
      };

      const result = verifySocietyRegistrar(mockDoc);
      assert.equal(result.status, "FORMAT_INVALID");
    });
  });

  describe("2. Revenue Department / Land Records Adapter", () => {
    it("should return VERIFIED_SIMULATED for compliant registered sale deed", () => {
      const mockDoc = {
        id: "doc-03-land",
        documentType: "DOC_03_LAND_DEED",
        extractedData: {
          doc03LandDeed: {
            deedRegistrationNumber: { value: "SD/SEH/2019/3321" },
            transfereeLesseeName: { value: "Vidyapeeth Educational Trust" },
            landAreaAcres: { value: 8.5 },
            khasraSurveyPlotNumbers: { value: ["201/1"] },
          },
        },
      };

      const result = verifyLandRevenueRecord(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.authorityCategory, "REVENUE_DEPARTMENT");
      assert.equal(result.discrepancies.length, 0);
      assert.ok(result.summary.includes("Verified in simulated Bhulekh land registry"));
    });

    it("should return MISMATCH_DETECTED if land deed area diverges from revenue record", () => {
      const mockDoc = {
        id: "doc-03-area-mismatch",
        documentType: "DOC_03_LAND_DEED",
        extractedData: {
          doc03LandDeed: {
            deedRegistrationNumber: { value: "SD/SEH/2019/3321" },
            transfereeLesseeName: { value: "Vidyapeeth Educational Trust" },
            landAreaAcres: { value: 5.0 }, // authoritative is 8.5
          },
        },
      };

      const result = verifyLandRevenueRecord(mockDoc);
      assert.equal(result.status, "MISMATCH_DETECTED");
      assert.ok(result.discrepancies.some((d) => d.field === "landAreaAcres"));
    });

    it("should return VERIFIED_SIMULATED for compliant land conversion order", () => {
      const mockDoc = {
        id: "doc-05-land-use",
        documentType: "DOC_05_LAND_USE",
        extractedData: {
          doc05LandUse: {
            orderReferenceNumber: { value: "REV/LUC/2020/0142" },
            landownerApplicantName: { value: "Vidyapeeth Educational Trust" },
            permittedLandUse: { value: "educational and institutional purposes" },
          },
        },
      };

      const result = verifyLandRevenueRecord(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.discrepancies.length, 0);
    });
  });

  describe("3. Fire Services Adapter", () => {
    it("should return VERIFIED_SIMULATED for active Fire Safety NOC", () => {
      const mockDoc = {
        id: "doc-09-fire",
        documentType: "DOC_09_FIRE_SAFETY",
        extractedData: {
          doc09FireSafety: {
            certificateReferenceNumber: { value: "FS/NOC/2026/0219" },
            institutionNameReferenced: { value: "Vidyapeeth Institute of Technology and Science" },
            validUntilDate: { value: "2027-02-01" },
          },
        },
      };

      const result = verifyFireServices(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.authorityCategory, "FIRE_SERVICES");
      assert.equal(result.discrepancies.length, 0);
    });

    it("should return EXPIRED_AT_SOURCE when statutory fire NOC is expired at source", () => {
      const mockDoc = {
        id: "doc-09-expired",
        documentType: "DOC_09_FIRE_SAFETY",
        extractedData: {
          doc09FireSafety: {
            certificateReferenceNumber: { value: "FS/NOC/2023/0112" }, // expired in 2024
            institutionNameReferenced: { value: "Surya Institute of Technology" },
          },
        },
      };

      const result = verifyFireServices(mockDoc);
      assert.equal(result.status, "EXPIRED_AT_SOURCE");
      assert.ok(result.summary.includes("EXPIRED at source"));
      assert.ok(result.scrutinyActionPrompt.includes("Mandatory deficiency"));
    });
  });

  describe("4. Council of Architecture (CoA) Adapter", () => {
    it("should return VERIFIED_SIMULATED when architect is actively registered in CoA roll", () => {
      const mockDoc = {
        id: "doc-06-plan",
        documentType: "DOC_06_BUILDING_PLAN",
        extractedData: {
          doc06BuildingPlan: {
            architectName: { value: "Ar. Rajesh Verma" },
            architectCoaRegistrationNumber: { value: "CA/2012/55443" },
          },
        },
      };

      const result = verifyArchitectCouncil(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.discrepancies.length, 0);
      assert.ok(result.authoritativeFields !== null);
      assert.equal(result.authoritativeFields.architectName, "Ar. Rajesh Verma");
    });

    it("should return FORMAT_VALID_UNVERIFIED when format matches CA/YYYY/NNNNN but architect is unconfirmed in roll", () => {
      const mockDoc = {
        id: "doc-06-unverified-roll",
        documentType: "DOC_06_BUILDING_PLAN",
        extractedData: {
          doc06BuildingPlan: {
            architectName: { value: "Ar. Unknown Person" },
            architectCoaRegistrationNumber: { value: "CA/2020/99999" }, // valid syntax, not in mock roll
          },
        },
      };

      const result = verifyArchitectCouncil(mockDoc);
      assert.equal(result.status, "FORMAT_VALID_UNVERIFIED");
      assert.equal(result.verificationMode, "FORMAT_REGISTRY_CHECK");
      assert.ok(result.summary.includes("Format validation alone does not confirm active legal standing"));
    });

    it("should return FORMAT_INVALID when registration string violates CoA syntax", () => {
      const mockDoc = {
        id: "doc-06-bad-syntax",
        documentType: "DOC_06_BUILDING_PLAN",
        extractedData: {
          doc06BuildingPlan: {
            architectCoaRegistrationNumber: { value: "COA-INVALID-NUMBER" },
          },
        },
      };

      const result = verifyArchitectCouncil(mockDoc);
      assert.equal(result.status, "FORMAT_INVALID");
      assert.ok(result.discrepancies.some((d) => d.field === "architectCoaRegistrationNumber"));
    });
  });

  describe("5. Bank Confirmation Tracking Adapter", () => {
    it("should return VERIFIED_SIMULATED for unencumbered bank deposit response", () => {
      const mockDoc = {
        id: "doc-10-bank",
        documentType: "DOC_10_BANK_FUNDS",
        extractedData: {
          doc10BankFunds: {
            accountOrFdrNumber: { value: "FDR/39881029481" },
            bankName: { value: "State Bank of India" },
            accountHolderName: { value: "Vidyapeeth Educational Trust" },
            amountInLakhsINR: { value: 150 },
            isUnencumbered: { value: true },
          },
        },
      };

      const result = verifyBankConfirmation(mockDoc);
      assert.equal(result.status, "VERIFIED_SIMULATED");
      assert.equal(result.verificationMode, "SIMULATED_BRANCH_INQUIRY");
      assert.equal(result.sourceName, "Simulated Bank Branch Confirmation Response");
      assert.equal(result.discrepancies.length, 0);
    });

    it("should return MISMATCH_DETECTED with lien warning when branch inquiry discloses active encumbrance", () => {
      const mockDoc = {
        id: "doc-10-lien",
        documentType: "DOC_10_BANK_FUNDS",
        extractedData: {
          doc10BankFunds: {
            accountOrFdrNumber: { value: "FDR/38119028472" }, // Scenario 8 FDR
            bankName: { value: "Canara Bank" },
            accountHolderName: { value: "Vindhya Knowledge Society" },
            amountInLakhsINR: { value: 125 },
            isUnencumbered: { value: true }, // document claims unencumbered
          },
        },
      };

      const result = verifyBankConfirmation(mockDoc);
      assert.equal(result.status, "MISMATCH_DETECTED");
      assert.ok(result.discrepancies.some((d) => d.field === "isUnencumbered"));
      assert.ok(result.summary.includes("Active lien/charge detected"));
    });

    it("should return CONFIRMATION_PENDING when bank confirmation response is not in mock records", () => {
      const mockDoc = {
        id: "doc-10-pending",
        documentType: "DOC_10_BANK_FUNDS",
        extractedData: {
          doc10BankFunds: {
            accountOrFdrNumber: { value: "FDR/UNKNOWN/77777" },
            bankName: { value: "Axis Bank" },
          },
        },
      };

      const result = verifyBankConfirmation(mockDoc);
      assert.equal(result.status, "CONFIRMATION_PENDING");
      assert.equal(result.verificationMode, "MANUAL_CONFIRMATION_ROUTED");
      assert.ok(result.summary.includes("Branch confirmation pending"));
      assert.ok(result.scrutinyActionPrompt.includes("cannot treat bank funds as verified until written confirmation is received"));
    });

    it("should return CONFIRMATION_RECORDED when scrutiny officer records official branch confirmation letter", () => {
      const mockDoc = {
        id: "doc-10-officer",
        documentType: "DOC_10_BANK_FUNDS",
        extractedData: {
          doc10BankFunds: {
            accountOrFdrNumber: { value: "FDR/UNKNOWN/77777" },
          },
        },
      };

      const officerPayload = {
        letterReference: "SBI/SEH/CONF/2026/410",
        letterDate: "2026-08-16",
        recordingOfficer: "Shri A. K. Verma, Scrutiny Officer",
        branchManagerName: "Shri Manoj Sharma",
        confirmedAmountLakhs: 150,
        isUnencumbered: true,
        remarks: "Original ink-signed confirmation letter on official bank letterhead examined and filed in Part B dossier.",
      };

      const result = verifyBankConfirmation(mockDoc, officerPayload);
      assert.equal(result.status, "CONFIRMATION_RECORDED");
      assert.equal(result.verificationMode, "MANUAL_CONFIRMATION_ROUTED");
      assert.ok(result.sourceName.includes("Officer-Recorded Bank Confirmation"));
      assert.equal(result.discrepancies.length, 0);
      assert.ok(result.summary.includes("Official bank confirmation letter verified and recorded on file"));
    });
  });
});
