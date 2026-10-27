import {
  MOCK_LAND_RECORDS,
  type LandRecordRegistryEntry,
} from "../../fixtures/mock-authority-registry.fixture.js";
import type { AdapterVerificationResult, FieldDiscrepancy } from "./types.js";

function normalizeString(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractFieldValue(fieldObj: any): any {
  if (fieldObj === null || fieldObj === undefined) return null;
  if (typeof fieldObj === "object" && "value" in fieldObj) {
    return fieldObj.value;
  }
  return fieldObj;
}

export function verifyLandRevenueRecord(
  document: any
): AdapterVerificationResult {
  const isLandDeed = document?.documentType === "DOC_03_LAND_DEED";
  const docData = isLandDeed
    ? document?.extractedData?.doc03LandDeed || document?.extractedData || {}
    : document?.extractedData?.doc05LandUse || document?.extractedData || {};

  const authorityName = "State Revenue Department & Bhulekh Land Records (Simulated)";
  const sourceName = "Simulated Bhulekh Land Records & Registration Portal";

  if (isLandDeed) {
    const deedRegNo = extractFieldValue(docData.deedRegistrationNumber) || extractFieldValue(docData.registrationNumber);
    const transferee = extractFieldValue(docData.transfereeLesseeName) || extractFieldValue(docData.buyerTransferee);
    const khasras = extractFieldValue(docData.khasraSurveyPlotNumbers) || extractFieldValue(docData.khasraNumbers);
    const area = extractFieldValue(docData.landAreaAcres) || extractFieldValue(docData.parcelArea);
    const location = extractFieldValue(docData.landRevenueLocation) || extractFieldValue(docData.landLocation);

    const submittedFields = {
      deedRegistrationNumber: deedRegNo,
      transfereeLesseeName: transferee,
      khasraSurveyPlotNumbers: khasras,
      landAreaAcres: area,
      landRevenueLocation: location,
    };

    if (!deedRegNo || String(deedRegNo).trim().length === 0) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
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
            field: "deedRegistrationNumber",
            label: "Deed Registration Number",
            submitted: null,
            authoritative: null,
            observation: "Deed registration number could not be extracted from the submitted land title document.",
          },
        ],
        summary: "Land deed registration number missing or illegible in submitted document.",
        scrutinyActionPrompt: "Request certified copy of registered sale/lease deed displaying clear registration endorsement number.",
      };
    }

    const queryRef = String(deedRegNo).trim();
    const found = MOCK_LAND_RECORDS.find(
      (item) => item.deedRegistrationNumber && normalizeString(item.deedRegistrationNumber) === normalizeString(queryRef)
    );

    if (!found) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
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
            field: "deedRegistrationNumber",
            label: "Bhulekh Registration Record",
            submitted: queryRef,
            authoritative: null,
            observation: `Deed registration reference ${queryRef} not found in simulated Bhulekh land database.`,
          },
        ],
        summary: `Deed reference ${queryRef} not found in simulated Revenue database. Note: absence from mock registry indicates no match in this simulated system and does not constitute official denial.`,
        scrutinyActionPrompt: "Scrutiny committee should verify title authenticity with the local Sub-Registrar Office.",
      };
    }

    const discrepancies: FieldDiscrepancy[] = [];
    const normTransferee = normalizeString(transferee);
    const normOwner = normalizeString(found.ownerName);

    if (normTransferee && normOwner && normTransferee !== normOwner) {
      discrepancies.push({
        field: "transfereeLesseeName",
        label: "Title Holder / Owner Name",
        submitted: transferee,
        authoritative: found.ownerName,
        observation: `Title grantee '${transferee}' does not match registered title holder '${found.ownerName}' in land revenue records.`,
      });
    }

    if (area !== null && area !== undefined && typeof area === "number") {
      if (Math.abs(area - found.totalAreaAcres) > 0.05) {
        discrepancies.push({
          field: "landAreaAcres",
          label: "Registered Land Acreage",
          submitted: area,
          authoritative: found.totalAreaAcres,
          observation: `Submitted land area (${area} acres) differs from revenue registry area (${found.totalAreaAcres} acres).`,
        });
      }
    }

    const authoritativeFields = {
      deedRegistrationNumber: found.deedRegistrationNumber,
      ownerName: found.ownerName,
      khasraNumbers: found.khasraNumbers,
      totalAreaAcres: found.totalAreaAcres,
      district: found.district,
      tehsil: found.tehsil,
      village: found.village,
      encumbranceStatus: found.encumbranceStatus,
      registrationDate: found.registrationDate,
    };

    if (discrepancies.length > 0) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
        authorityName,
        verificationMode: "SIMULATED_REGISTRY",
        sourceName,
        queryReference: queryRef,
        documentId: document?.id || null,
        status: "MISMATCH_DETECTED",
        submittedFields,
        authoritativeFields,
        discrepancies,
        summary: `Land deed record found, but ${discrepancies.length} discrepancy(ies) detected between submitted deed and simulated revenue registry.`,
        scrutinyActionPrompt: "Require applicant to submit certified revenue khatian/mutated revenue entry matching the sponsoring body.",
      };
    }

    return {
      authorityCategory: "REVENUE_DEPARTMENT",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "VERIFIED_SIMULATED",
      submittedFields,
      authoritativeFields,
      discrepancies: [],
      summary: `Verified in simulated Bhulekh land registry. Title registered in favour of '${found.ownerName}', area ${found.totalAreaAcres} acres, unencumbered.`,
      scrutinyActionPrompt: "Title verified in simulated land registry. Proceed to check land conversion order.",
    };
  } else {
    // DOC_05_LAND_USE conversion order
    const orderRefNo = extractFieldValue(docData.orderReferenceNumber) || extractFieldValue(docData.orderNumber);
    const applicantName = extractFieldValue(docData.landownerApplicantName) || extractFieldValue(docData.applicantName);
    const khasras = extractFieldValue(docData.khasraSurveyPlotNumbers) || extractFieldValue(docData.khasraNumbers);
    const area = extractFieldValue(docData.landAreaAcres);
    const permittedUse = extractFieldValue(docData.permittedLandUse) || extractFieldValue(docData.permittedUse);

    const submittedFields = {
      orderReferenceNumber: orderRefNo,
      landownerApplicantName: applicantName,
      khasraSurveyPlotNumbers: khasras,
      landAreaAcres: area,
      permittedLandUse: permittedUse,
    };

    if (!orderRefNo || String(orderRefNo).trim().length === 0) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
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
            field: "orderReferenceNumber",
            label: "Conversion Order Reference Number",
            submitted: null,
            authoritative: null,
            observation: "Land use conversion order reference number could not be extracted.",
          },
        ],
        summary: "Conversion order reference number missing or illegible in submitted document.",
        scrutinyActionPrompt: "Request clear certified copy of the Sub-Divisional Officer/Collector land conversion order.",
      };
    }

    const queryRef = String(orderRefNo).trim();
    const found = MOCK_LAND_RECORDS.find(
      (item) => item.conversionOrderNumber && normalizeString(item.conversionOrderNumber) === normalizeString(queryRef)
    );

    if (!found) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
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
            field: "orderReferenceNumber",
            label: "Revenue Conversion Order",
            submitted: queryRef,
            authoritative: null,
            observation: `Order reference ${queryRef} not found in simulated SDO/Collector revenue order register.`,
          },
        ],
        summary: `Conversion order reference ${queryRef} not found in simulated Revenue database.`,
        scrutinyActionPrompt: "Scrutiny committee should verify conversion order with the issuing Collector/SDO office.",
      };
    }

    const discrepancies: FieldDiscrepancy[] = [];
    const normApplicant = normalizeString(applicantName);
    const normOwner = normalizeString(found.ownerName);

    if (normApplicant && normOwner && normApplicant !== normOwner) {
      discrepancies.push({
        field: "landownerApplicantName",
        label: "Conversion Grantee Name",
        submitted: applicantName,
        authoritative: found.ownerName,
        observation: `Conversion applicant '${applicantName}' does not match official record '${found.ownerName}'.`,
      });
    }

    const authoritativeFields = {
      conversionOrderNumber: found.conversionOrderNumber,
      ownerName: found.ownerName,
      khasraNumbers: found.khasraNumbers,
      totalAreaAcres: found.totalAreaAcres,
      permittedUse: found.permittedUse,
      orderDate: found.orderDate,
    };

    if (discrepancies.length > 0) {
      return {
        authorityCategory: "REVENUE_DEPARTMENT",
        authorityName,
        verificationMode: "SIMULATED_REGISTRY",
        sourceName,
        queryReference: queryRef,
        documentId: document?.id || null,
        status: "MISMATCH_DETECTED",
        submittedFields,
        authoritativeFields,
        discrepancies,
        summary: `Land conversion order located, but ${discrepancies.length} discrepancy(ies) detected.`,
        scrutinyActionPrompt: "Request verified conversion order issued to the correct sponsoring entity.",
      };
    }

    return {
      authorityCategory: "REVENUE_DEPARTMENT",
      authorityName,
      verificationMode: "SIMULATED_REGISTRY",
      sourceName,
      queryReference: queryRef,
      documentId: document?.id || null,
      status: "VERIFIED_SIMULATED",
      submittedFields,
      authoritativeFields,
      discrepancies: [],
      summary: `Verified in simulated Revenue database. Order grants educational institutional use for ${found.totalAreaAcres} acres in favour of '${found.ownerName}'.`,
      scrutinyActionPrompt: "Land use conversion order verified against simulated revenue records.",
    };
  }
}
