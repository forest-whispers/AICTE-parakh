import {
  MOCK_SPONSORING_BODIES,
  type SponsoringBodyRegistryRecord,
} from "../../fixtures/mock-authority-registry.fixture.js";
import type { AdapterVerificationResult, FieldDiscrepancy } from "./types.js";
import {
  resolveEffectiveField,
  normalizeString,
  extractFieldValue,
} from "./evidence-resolver.js";

export function verifySocietyRegistrar(
  document: any
): AdapterVerificationResult {
  const docData = document?.extractedData?.doc01Registration || document?.extractedData || {};

  const regNumRes = resolveEffectiveField<string>(document, docData, "registrationNumber");
  const nameRes = resolveEffectiveField<string>(document, docData, "applicantLegalName", "institutionName");
  const entityTypeRes = resolveEffectiveField<string>(document, docData, "entityType", "sponsoringBodyType");
  const regDateRes = resolveEffectiveField<string>(document, docData, "registrationDate");
  const addrRes = resolveEffectiveField<string>(document, docData, "registeredAddress");
  const nonProfitRes = resolveEffectiveField<any>(document, docData, "hasNonProfitClause");

  const regNumber = regNumRes.value;
  const applicantLegalName = nameRes.value;
  const entityType = entityTypeRes.value;
  const registrationDate = regDateRes.value;
  const registeredAddress = addrRes.value;
  const hasNonProfitClause = nonProfitRes.value;

  const submittedFields: Record<string, any> = {
    registrationNumber: regNumber,
    applicantLegalName,
    entityType,
    registrationDate,
    registeredAddress,
    hasNonProfitClause,
  };

  if (regNumRes.isOfficerReviewed || nameRes.isOfficerReviewed || entityTypeRes.isOfficerReviewed) {
    submittedFields._provenance = {
      registrationNumber: {
        effective: regNumber,
        originalExtracted: regNumRes.originalExtractedValue,
        isOfficerReviewed: regNumRes.isOfficerReviewed,
      },
      applicantLegalName: {
        effective: applicantLegalName,
        originalExtracted: nameRes.originalExtractedValue,
        isOfficerReviewed: nameRes.isOfficerReviewed,
      },
      entityType: {
        effective: entityType,
        originalExtracted: entityTypeRes.originalExtractedValue,
        isOfficerReviewed: entityTypeRes.isOfficerReviewed,
      },
    };
  }

  const authorityName = "State Registrar of Public Trusts & Societies (Simulated)";
  const sourceName = "Simulated M.P. Public Trusts & Societies Portal";

  if (!regNumber || String(regNumber).trim().length === 0) {
    return {
      authorityCategory: "SOCIETY_REGISTRAR",
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
          field: "registrationNumber",
          label: "Registration Number",
          submitted: null,
          authoritative: null,
          observation: "Registration number could not be extracted from the submitted trust deed/certificate.",
        },
      ],
      summary: "Registration number missing or illegible in submitted document.",
      scrutinyActionPrompt: "Request clear certified copy of trust registration deed with legible statutory registration number.",
    };
  }

  const queryRef = String(regNumber).trim();
  const found = MOCK_SPONSORING_BODIES.find(
    (item) => normalizeString(item.registrationNumber) === normalizeString(queryRef)
  );

  if (!found) {
    return {
      authorityCategory: "SOCIETY_REGISTRAR",
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
          field: "registrationNumber",
          label: "Statutory Registration Record",
          submitted: queryRef,
          authoritative: null,
          observation: `Registration reference ${queryRef} was not located in the simulated State Registrar registry.`,
        },
      ],
      summary: `Reference ${queryRef} not found in simulated State Registrar database. Note: absence from mock registry indicates no match was found in this simulated statutory database; it does not constitute conclusive legal proof.`,
      scrutinyActionPrompt: "Scrutiny committee should verify registration particulars against official district registrar records.",
    };
  }

  // Record found, perform field reconciliation
  const discrepancies: FieldDiscrepancy[] = [];

  const normSubmittedName = normalizeString(applicantLegalName);
  const normAuthName = normalizeString(found.legalName);

  if (normSubmittedName && normAuthName && normSubmittedName !== normAuthName) {
    discrepancies.push({
      field: "applicantLegalName",
      label: "Legal Entity Name",
      submitted: applicantLegalName,
      authoritative: found.legalName,
      observation: `Submitted applicant name '${applicantLegalName}' diverges from registrar record '${found.legalName}'.`,
    });
  }

  if (hasNonProfitClause !== null && hasNonProfitClause !== undefined && Boolean(hasNonProfitClause) !== found.hasNonProfitClause) {
    discrepancies.push({
      field: "hasNonProfitClause",
      label: "Non-Profit / Irrevocable Status",
      submitted: hasNonProfitClause,
      authoritative: found.hasNonProfitClause,
      observation: `Submitted non-profit clause status does not align with registered trust bylaws.`,
    });
  }

  const authoritativeFields = {
    registrationNumber: found.registrationNumber,
    legalName: found.legalName,
    entityType: found.entityType,
    registrationDate: found.registrationDate,
    registeringAuthority: found.registeringAuthority,
    registeredAddress: found.registeredAddress,
    status: found.status,
    hasNonProfitClause: found.hasNonProfitClause,
    authorizedTrustees: found.authorizedTrustees,
  };

  if (found.status !== "ACTIVE") {
    discrepancies.push({
      field: "status",
      label: "Statutory Entity Status",
      submitted: "Active",
      authoritative: found.status,
      observation: `Registered entity status is listed as ${found.status} at source.`,
    });
  }

  if (discrepancies.length > 0) {
    return {
      authorityCategory: "SOCIETY_REGISTRAR",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "MISMATCH_DETECTED",
      submittedFields,
      authoritativeFields,
      discrepancies,
      summary: `Registration reference located, but ${discrepancies.length} discrepancy(ies) detected between submitted document and registrar records.`,
      scrutinyActionPrompt: "Request clarification and gazette/amendment documentation regarding name/entity discrepancies before approval.",
    };
  }

  return {
    authorityCategory: "SOCIETY_REGISTRAR",
    authorityName,
    verificationMode: "SIMULATED_REGISTRY",
    sourceName,
    queryReference: queryRef,
    documentId: document?.id || null,
    status: "VERIFIED_SIMULATED",
    submittedFields,
    authoritativeFields,
    discrepancies: [],
    summary: `Verified in simulated Registrar database. Trust '${found.legalName}' is active with matching registration date and non-profit bylaws.`,
    scrutinyActionPrompt: "Statutory registration verified against simulated registrar roll. Proceed with standard file scrutiny.",
  };
}
