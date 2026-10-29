import {
  MOCK_FIRE_NOCS,
  type FireNocRegistryRecord,
} from "../../fixtures/mock-authority-registry.fixture.js";
import type { AdapterVerificationResult, FieldDiscrepancy } from "./types.js";
import {
  resolveEffectiveField,
  normalizeString,
  extractFieldValue,
} from "./evidence-resolver.js";

export function verifyFireServices(
  document: any
): AdapterVerificationResult {
  const docData = document?.extractedData?.doc09FireSafety || document?.extractedData || {};

  const certRes = resolveEffectiveField<string>(document, docData, "certificateReferenceNumber", "certificateNumber");
  const instRes = resolveEffectiveField<string>(document, docData, "institutionNameReferenced", "institutionName");
  const siteRes = resolveEffectiveField<string>(document, docData, "campusPhysicalSiteAddress", "siteAddress");
  const issueDateRes = resolveEffectiveField<string>(document, docData, "issueDate");
  const expiryDateRes = resolveEffectiveField<string>(document, docData, "expiryDate", "validUntilDate");

  const certNumber = certRes.value;
  const instName = instRes.value;
  const siteAddress = siteRes.value;
  const issueDate = issueDateRes.value;
  const expiryDate = expiryDateRes.value;

  const submittedFields: Record<string, any> = {
    certificateNumber: certNumber,
    institutionName: instName,
    siteAddress,
    issueDate,
    expiryDate,
  };

  if (certRes.isOfficerReviewed || instRes.isOfficerReviewed || expiryDateRes.isOfficerReviewed) {
    submittedFields._provenance = {
      certificateNumber: {
        effective: certNumber,
        originalExtracted: certRes.originalExtractedValue,
        isOfficerReviewed: certRes.isOfficerReviewed,
      },
      institutionName: {
        effective: instName,
        originalExtracted: instRes.originalExtractedValue,
        isOfficerReviewed: instRes.isOfficerReviewed,
      },
      expiryDate: {
        effective: expiryDate,
        originalExtracted: expiryDateRes.originalExtractedValue,
        isOfficerReviewed: expiryDateRes.isOfficerReviewed,
      },
    };
  }

  const authorityName = "State Directorate of Fire & Emergency Services (Simulated)";
  const sourceName = "Simulated Fire Safety e-NOC Portal";

  if (!certNumber || String(certNumber).trim().length === 0) {
    return {
      authorityCategory: "FIRE_SERVICES",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: null,
      documentId: document?.id || null,
      status: "FORMAT_INVALID",
      submittedFields,
      authoritativeFields: null,
      discrepancies: [
        {
          field: "certificateNumber",
          label: "Fire NOC Certificate Reference",
          submitted: null,
          authoritative: null,
          observation: "Fire Safety NOC certificate reference number could not be extracted.",
        },
      ],
      summary: "Fire Safety NOC certificate number missing or illegible in submitted document.",
      scrutinyActionPrompt: "Request clear certified copy of the Fire Safety NOC issued by competent fire authority.",
    };
  }

  const queryRef = String(certNumber).trim();
  const found = MOCK_FIRE_NOCS.find(
    (item) => normalizeString(item.certificateNumber) === normalizeString(queryRef)
  );

  if (!found) {
    return {
      authorityCategory: "FIRE_SERVICES",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "RECORD_NOT_FOUND",
      submittedFields,
      authoritativeFields: null,
      discrepancies: [
        {
          field: "certificateNumber",
          label: "Fire Safety e-NOC Registry",
          submitted: queryRef,
          authoritative: null,
          observation: `NOC reference ${queryRef} not found in simulated Fire Services database.`,
        },
      ],
      summary: `NOC reference ${queryRef} not found in simulated Fire Services registry. Note: absence from mock registry indicates no match in this simulated database.`,
      scrutinyActionPrompt: "Scrutiny committee should verify validity of Fire NOC directly with regional fire authority.",
    };
  }

  const authoritativeFields = {
    certificateNumber: found.certificateNumber,
    institutionName: found.institutionName,
    siteAddress: found.siteAddress,
    issuingAuthority: found.issuingAuthority,
    issueDate: found.issueDate,
    expiryDate: found.expiryDate,
    status: found.status,
    coveredBlocks: found.coveredBlocks,
  };

  const discrepancies: FieldDiscrepancy[] = [];

  // Check if expired at source
  if (found.status === "EXPIRED") {
    discrepancies.push({
      field: "status",
      label: "Fire NOC Validity Status",
      submitted: "Purported active",
      authoritative: `EXPIRED (Expired on ${found.expiryDate})`,
      observation: `Official fire portal lists NOC certificate as EXPIRED on ${found.expiryDate}.`,
    });

    return {
      authorityCategory: "FIRE_SERVICES",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "EXPIRED_AT_SOURCE",
      submittedFields,
      authoritativeFields,
      discrepancies,
      summary: `Fire Safety NOC ${queryRef} is EXPIRED at source (expiry: ${found.expiryDate}). A valid, active NOC is mandatory under APH Chapter I.`,
      scrutinyActionPrompt: "Reject expired NOC. Mandatory deficiency under APH Ch I: Applicant must submit an active, unexpired Fire Safety Certificate.",
    };
  }

  const normSubmittedInst = normalizeString(instName);
  const normAuthInst = normalizeString(found.institutionName);

  if (normSubmittedInst && normAuthInst && normSubmittedInst !== normAuthInst) {
    discrepancies.push({
      field: "institutionName",
      label: "Institution Name on Fire NOC",
      submitted: instName,
      authoritative: found.institutionName,
      observation: `Institution name '${instName}' does not match official NOC grantee '${found.institutionName}'.`,
    });
  }

  if (discrepancies.length > 0) {
    return {
      authorityCategory: "FIRE_SERVICES",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "MISMATCH_DETECTED",
      submittedFields,
      authoritativeFields,
      discrepancies,
      summary: `Fire NOC record located, but ${discrepancies.length} discrepancy(ies) detected.`,
      scrutinyActionPrompt: "Request revised Fire Safety NOC correctly endorsed to the proposed institution name.",
    };
  }

  return {
    authorityCategory: "FIRE_SERVICES",
    authorityName,
    verificationMode: "SIMULATED_REGISTRY",
    sourceName,
    queryReference: queryRef,
    documentId: document?.id || null,
    status: "VERIFIED_SIMULATED",
    submittedFields,
    authoritativeFields,
    discrepancies: [],
    summary: `Verified in simulated Fire Safety portal. Active NOC valid until ${found.expiryDate} covering ${found.coveredBlocks}.`,
    scrutinyActionPrompt: "Fire Safety NOC verified active against simulated portal. Proceed.",
  };
}
