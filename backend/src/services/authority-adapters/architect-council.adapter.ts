import {
  MOCK_COA_ROLL,
  type ArchitectCoaRecord,
} from "../../fixtures/mock-authority-registry.fixture.js";
import type { AdapterVerificationResult, FieldDiscrepancy } from "./types.js";
import {
  resolveEffectiveField,
  normalizeString,
  extractFieldValue,
} from "./evidence-resolver.js";

export function verifyArchitectCouncil(
  document: any
): AdapterVerificationResult {
  const docData = document?.extractedData?.doc06BuildingPlan || document?.extractedData || {};

  const nameRes = resolveEffectiveField<string>(document, docData, "architectName");
  const regRes = resolveEffectiveField<string>(document, docData, "architectCoaRegistrationNumber", "architectCoaRegistration");

  const architectName = nameRes.value;
  const coaRegNo = regRes.value;

  const submittedFields: Record<string, any> = {
    architectName,
    architectCoaRegistrationNumber: coaRegNo,
  };

  if (nameRes.isOfficerReviewed || regRes.isOfficerReviewed) {
    submittedFields._provenance = {
      architectName: {
        effective: architectName,
        originalExtracted: nameRes.originalExtractedValue,
        isOfficerReviewed: nameRes.isOfficerReviewed,
      },
      architectCoaRegistrationNumber: {
        effective: coaRegNo,
        originalExtracted: regRes.originalExtractedValue,
        isOfficerReviewed: regRes.isOfficerReviewed,
      },
    };
  }

  const authorityName = "Council of Architecture (CoA) National Roll";
  const sourceName = "Simulated CoA Statutory Roll of Architects";

  if (!coaRegNo || String(coaRegNo).trim().length === 0) {
    return {
      authorityCategory: "COUNCIL_OF_ARCHITECTURE",
      authorityName,
      verificationMode: "FORMAT_REGISTRY_CHECK",
      sourceName,
      queryReference: null,
      documentId: document?.id || null,
      status: "FORMAT_INVALID",
      submittedFields,
      authoritativeFields: null,
      discrepancies: [
        {
          field: "architectCoaRegistrationNumber",
          label: "CoA Registration Number",
          submitted: null,
          authoritative: null,
          observation: "Council of Architecture registration number could not be extracted from the building plan.",
        },
      ],
      summary: "CoA registration number missing on building plan endorsement.",
      scrutinyActionPrompt: "Building plans must be certified and signed by an architect registered with the Council of Architecture.",
    };
  }

  const queryRef = String(coaRegNo).trim();
  const coaFormatRegex = /^CA\/\d{4}\/\d{5}$/i;
  const isFormatValid = coaFormatRegex.test(queryRef);

  if (!isFormatValid) {
    return {
      authorityCategory: "COUNCIL_OF_ARCHITECTURE",
      authorityName,
      verificationMode: "FORMAT_REGISTRY_CHECK",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "FORMAT_INVALID",
      submittedFields,
      authoritativeFields: null,
      discrepancies: [
        {
          field: "architectCoaRegistrationNumber",
          label: "CoA Registration Format",
          submitted: queryRef,
          authoritative: "CA/YYYY/NNNNN",
          observation: `Registration number '${queryRef}' does not adhere to statutory CoA syntax (CA/YYYY/NNNNN).`,
        },
      ],
      summary: `CoA registration '${queryRef}' failed statutory format validation.`,
      scrutinyActionPrompt: "Request building plans authenticated with a valid Council of Architecture registration certificate.",
    };
  }

  // Format passed; look up in national roll
  const found = MOCK_COA_ROLL.find(
    (item) => normalizeString(item.registrationNumber) === normalizeString(queryRef)
  );

  if (!found) {
    // Format is valid, but record not present in simulated roll
    return {
      authorityCategory: "COUNCIL_OF_ARCHITECTURE",
      authorityName,
      verificationMode: "FORMAT_REGISTRY_CHECK",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "FORMAT_VALID_UNVERIFIED",
      submittedFields,
      authoritativeFields: null,
      discrepancies: [
        {
          field: "architectCoaRegistrationNumber",
          label: "CoA National Roll Entry",
          submitted: queryRef,
          authoritative: null,
          observation: `Number format valid, but architect registration ${queryRef} not found in simulated national roll.`,
        },
      ],
      summary: `CoA format valid (CA/YYYY/NNNNN), but unconfirmed on simulated national roll. Format validation alone does not confirm active legal standing.`,
      scrutinyActionPrompt: "Scrutiny committee should check active standing on the CoA portal (coa.gov.in) prior to committee clearance.",
    };
  }

  const authoritativeFields = {
    registrationNumber: found.registrationNumber,
    architectName: found.architectName,
    registrationStatus: found.registrationStatus,
    validUpTo: found.validUpTo,
    qualification: found.qualification,
    registeredCity: found.registeredCity,
  };

  const discrepancies: FieldDiscrepancy[] = [];
  const normSubmittedName = normalizeString(architectName);
  const normAuthName = normalizeString(found.architectName);

  if (normSubmittedName && normAuthName && !normAuthName.includes(normSubmittedName) && !normSubmittedName.includes(normAuthName)) {
    discrepancies.push({
      field: "architectName",
      label: "Architect Name",
      submitted: architectName,
      authoritative: found.architectName,
      observation: `Architect name on blueprint '${architectName}' differs from CoA registered practitioner '${found.architectName}'.`,
    });
  }

  if (found.registrationStatus !== "ACTIVE") {
    discrepancies.push({
      field: "registrationStatus",
      label: "CoA Registration Status",
      submitted: "Active",
      authoritative: found.registrationStatus,
      observation: `CoA roll indicates architect registration is ${found.registrationStatus}.`,
    });
  }

  if (discrepancies.length > 0) {
    return {
      authorityCategory: "COUNCIL_OF_ARCHITECTURE",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "MISMATCH_DETECTED",
      submittedFields,
      authoritativeFields,
      discrepancies,
      summary: `CoA registration record found, but ${discrepancies.length} discrepancy(ies) detected.`,
      scrutinyActionPrompt: "Clarify certifying architect credentials and ensure active CoA registration.",
    };
  }

  return {
    authorityCategory: "COUNCIL_OF_ARCHITECTURE",
    authorityName,
    verificationMode: "SIMULATED_REGISTRY",
    sourceName,
    queryReference: queryRef,
    documentId: document?.id || null,
    status: "VERIFIED_SIMULATED",
    submittedFields,
    authoritativeFields,
    discrepancies: [],
    summary: `Verified in simulated CoA Roll. '${found.architectName}' is actively registered through ${found.validUpTo}.`,
    scrutinyActionPrompt: "Architect credentials verified against simulated CoA roll. Sanctioned plan credentials confirmed.",
  };
}
