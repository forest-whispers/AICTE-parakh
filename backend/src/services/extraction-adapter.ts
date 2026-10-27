import type { FieldExtractionState } from "../schemas/extraction.schema.js";

export interface NormalizedField<T> {
  state: FieldExtractionState;
  value: T | null;
  rawText: string | null;
  pageNumber: number | null;
  excerpt: string | null;
  uncertaintyReason: string | null;
  sourceKey: string;
}

export function makeEmptyField<T>(sourceKey = "unknown"): NormalizedField<T> {
  return {
    state: "NOT_FOUND",
    value: null,
    rawText: null,
    pageNumber: null,
    excerpt: null,
    uncertaintyReason: null,
    sourceKey,
  };
}

export function extractField<T>(
  container: any,
  candidateKeys: string[],
  transform?: (val: any) => T | null
): NormalizedField<T> {
  if (!container || typeof container !== "object") {
    return makeEmptyField(candidateKeys[0] || "unknown");
  }

  for (const key of candidateKeys) {
    // Check nested or flat
    const fieldObj = container[key];
    if (fieldObj && typeof fieldObj === "object" && "state" in fieldObj) {
      const rawVal = fieldObj.value;
      const transformedVal =
        transform && rawVal !== null && rawVal !== undefined
          ? transform(rawVal)
          : (rawVal as T ?? null);

      return {
        state: fieldObj.state || (rawVal !== null && rawVal !== undefined ? "PRESENT" : "NOT_FOUND"),
        value: transformedVal,
        rawText: fieldObj.rawText ?? null,
        pageNumber: fieldObj.pageNumber ?? null,
        excerpt: fieldObj.excerpt ?? null,
        uncertaintyReason: fieldObj.uncertaintyReason ?? null,
        sourceKey: key,
      };
    }
  }

  return makeEmptyField(candidateKeys[0] || "unknown");
}

// Normalized Data Models per Document Type

export interface NormalizedDoc01Registration {
  entityType: NormalizedField<string>;
  trustSocietyName: NormalizedField<string>;
  registrationNumber: NormalizedField<string>;
  registrationDate: NormalizedField<string>;
  registeringAuthority: NormalizedField<string>;
  registeredAddress: NormalizedField<string>;
  hasNonProfitClause: NormalizedField<boolean>;
}

export interface NormalizedDoc02Resolution {
  trustSocietyName: NormalizedField<string>;
  proposedInstitutionName: NormalizedField<string>;
  resolutionDate: NormalizedField<string>;
  resolutionNumber: NormalizedField<string>;
  locationAddress: NormalizedField<string>;
  authorizedSignatories: NormalizedField<string>;
  proposedCoursesIntake: NormalizedField<string>;
}

export interface NormalizedDoc03LandDeed {
  documentType: NormalizedField<string>; // "Sale Deed", "Lease Deed", etc.
  landLocation: NormalizedField<string>;
  khasraNumbers: NormalizedField<string>;
  landAreaAcres: NormalizedField<number>;
  buyerTransferee: NormalizedField<string>;
  sellerTransferor: NormalizedField<string>;
  registrationNumber: NormalizedField<string>;
  registrationDate: NormalizedField<string>;
  registrarOffice: NormalizedField<string>;
  leaseTenureYears: NormalizedField<number>;
  leaseExpiryDate: NormalizedField<string>;
  leaseCommencementDate: NormalizedField<string>;
}

export interface NormalizedDoc04LeaseAffidavit {
  deponentName: NormalizedField<string>;
  isApplicable: NormalizedField<boolean>;
  executionDate: NormalizedField<string>;
  khasraNumbers: NormalizedField<string>;
  placeOfExecution: NormalizedField<string>;
  trustSocietyName: NormalizedField<string>;
  hasIrrevocableCommitment: NormalizedField<boolean>;
}

export interface NormalizedDoc05LandUse {
  issueDate: NormalizedField<string>;
  orderNumber: NormalizedField<string>;
  landLocation: NormalizedField<string>;
  permittedUse: NormalizedField<string>;
  applicantName: NormalizedField<string>;
  khasraNumbers: NormalizedField<string>;
  landAreaAcres: NormalizedField<number>;
  issuingAuthority: NormalizedField<string>;
}

export interface NormalizedDoc06BuildingPlan {
  farFsi: NormalizedField<number>;
  siteAddress: NormalizedField<string>;
  sanctionDate: NormalizedField<string>;
  architectName: NormalizedField<string>;
  sanctionNumber: NormalizedField<string>;
  institutionName: NormalizedField<string>;
  adminCarpetAreaSqm: NormalizedField<number>;
  amenitiesCarpetAreaSqm: NormalizedField<number>;
  totalBuiltUpAreaSqm: NormalizedField<number>;
  sanctioningAuthority: NormalizedField<string>;
  architectCoaRegistration: NormalizedField<string>;
}

export interface NormalizedDoc07Occupancy {
  issueDate: NormalizedField<string>;
  siteAddress: NormalizedField<string>;
  occupancyType: NormalizedField<string>; // "permanent", "provisional", "partial"
  buildingDetails: NormalizedField<string>;
  institutionName: NormalizedField<string>;
  issuingAuthority: NormalizedField<string>;
  certificateNumber: NormalizedField<string>;
  expiryDate: NormalizedField<string>;
}

export interface NormalizedDoc08StructuralStability {
  reviewDate: NormalizedField<string>;
  siteAddress: NormalizedField<string>;
  engineerName: NormalizedField<string>;
  inspectionDate: NormalizedField<string>;
  stabilityStatus: NormalizedField<string>;
  buildingAgeYears: NormalizedField<number>;
  certificateNumber: NormalizedField<string>;
  engineerQualifications: NormalizedField<string>;
  expiryDate: NormalizedField<string>;
}

export interface NormalizedDoc09FireSafety {
  issueDate: NormalizedField<string>;
  expiryDate: NormalizedField<string>;
  siteAddress: NormalizedField<string>;
  buildingDetails: NormalizedField<string>;
  institutionName: NormalizedField<string>;
  issuingAuthority: NormalizedField<string>;
  certificateNumber: NormalizedField<string>;
}

export interface NormalizedDoc10BankFunds {
  bankName: NormalizedField<string>;
  branchName: NormalizedField<string>;
  ifscCode: NormalizedField<string>;
  accountHolderName: NormalizedField<string>;
  amountInInr: NormalizedField<number>;
  amountInLakhsINR: NormalizedField<number>;
  fdrNumber: NormalizedField<string>;
  maturityDate: NormalizedField<string>;
  certificateDate: NormalizedField<string>;
  isUnencumbered: NormalizedField<boolean>;
  lienStatement: NormalizedField<string>;
}

export interface NormalizedDoc11Affidavit2 {
  deponentName: NormalizedField<string>;
  executionDate: NormalizedField<string>;
  placeOfExecution: NormalizedField<string>;
  trustSocietyName: NormalizedField<string>;
  proposedInstitutionName: NormalizedField<string>;
}

export interface NormalizedDoc14SiteMap {
  latitude: NormalizedField<number>;
  longitude: NormalizedField<number>;
  siteAddress: NormalizedField<string>;
  khasraNumbers: NormalizedField<string>;
  proposedInstitutionName: NormalizedField<string>;
}

// Adapters to construct normalized models from VLM output containers
export function adaptDoc01(container: any): NormalizedDoc01Registration {
  return {
    entityType: extractField(container, ["entityType"]),
    trustSocietyName: extractField(container, ["trustSocietyName", "applicantLegalName", "applicantName"]),
    registrationNumber: extractField(container, ["registrationNumber"]),
    registrationDate: extractField(container, ["registrationDate"]),
    registeringAuthority: extractField(container, ["registeringAuthority"]),
    registeredAddress: extractField(container, ["registeredAddress"]),
    hasNonProfitClause: extractField(container, ["hasNonProfitClause"]),
  };
}

export function adaptDoc02(container: any): NormalizedDoc02Resolution {
  return {
    trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName", "applicantName"]),
    proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
    resolutionDate: extractField(container, ["resolutionDate"]),
    resolutionNumber: extractField(container, ["resolutionNumber", "resolutionReferenceNumber"]),
    locationAddress: extractField(container, ["locationAddress", "siteAddress"]),
    authorizedSignatories: extractField(container, ["authorizedSignatories"]),
    proposedCoursesIntake: extractField(container, ["proposedCoursesIntake", "programmesStated"]),
  };
}

export function adaptDoc03(container: any): NormalizedDoc03LandDeed {
  return {
    documentType: extractField(container, ["documentType", "deedType"]),
    landLocation: extractField(container, ["landLocation", "landRevenueLocation", "siteAddress"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
    landAreaAcres: extractField(container, ["landAreaAcres", "parcelArea"]),
    buyerTransferee: extractField(container, ["buyerTransferee", "transfereeLesseeName"]),
    sellerTransferor: extractField(container, ["sellerTransferor", "transferorLessorName"]),
    registrationNumber: extractField(container, ["registrationNumber", "deedRegistrationNumber"]),
    registrationDate: extractField(container, ["registrationDate"]),
    registrarOffice: extractField(container, ["registrarOffice"]),
    leaseTenureYears: extractField(container, ["leaseTenureYears", "leasePeriodYears", "leaseDurationYears"]),
    leaseExpiryDate: extractField(container, ["leaseExpiryDate"]),
    leaseCommencementDate: extractField(container, ["leaseCommencementDate"]),
  };
}

export function adaptDoc04(container: any): NormalizedDoc04LeaseAffidavit {
  return {
    deponentName: extractField(container, ["deponentName"]),
    isApplicable: extractField(container, ["isApplicable"]),
    executionDate: extractField(container, ["executionDate"]),
    khasraNumbers: extractField(container, ["khasraNumbers"]),
    placeOfExecution: extractField(container, ["placeOfExecution"]),
    trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName"]),
    hasIrrevocableCommitment: extractField(container, ["hasIrrevocableCommitment"]),
  };
}

export function adaptDoc05(container: any): NormalizedDoc05LandUse {
  return {
    issueDate: extractField(container, ["issueDate", "orderDate"]),
    orderNumber: extractField(container, ["orderNumber", "orderReferenceNumber"]),
    landLocation: extractField(container, ["landLocation", "siteAddress"]),
    permittedUse: extractField(container, ["permittedUse", "permittedLandUse"]),
    applicantName: extractField(container, ["applicantName", "landownerApplicantName"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
    landAreaAcres: extractField(container, ["landAreaAcres"]),
    issuingAuthority: extractField(container, ["issuingAuthority"]),
  };
}

export function adaptDoc06(container: any): NormalizedDoc06BuildingPlan {
  // Support nested carpetAreaSummary or flat fields
  const adminCarpet = extractField(container, ["adminCarpetAreaSqm"], (val) => Number(val));
  const amenitiesCarpet = extractField(container, ["amenitiesCarpetAreaSqm"], (val) => Number(val));
  const totalArea = extractField(container, ["totalBuiltUpAreaSqm", "totalSanctionedBuiltUpArea"], (val) => Number(val));

  // If nested carpetAreaSummary was populated instead of flat fields
  if (adminCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.administrativeSqM) {
    adminCarpet.state = "PRESENT";
    adminCarpet.value = container.carpetAreaSummary.value.administrativeSqM;
    adminCarpet.rawText = String(container.carpetAreaSummary.value.administrativeSqM);
  }
  if (amenitiesCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.amenitiesSqM) {
    amenitiesCarpet.state = "PRESENT";
    amenitiesCarpet.value = container.carpetAreaSummary.value.amenitiesSqM;
    amenitiesCarpet.rawText = String(container.carpetAreaSummary.value.amenitiesSqM);
  }

  return {
    farFsi: extractField(container, ["farFsi", "statedFarFsi"], (val) => Number(val)),
    siteAddress: extractField(container, ["siteAddress", "institutionSiteAddress"]),
    sanctionDate: extractField(container, ["sanctionDate"]),
    architectName: extractField(container, ["architectName"]),
    sanctionNumber: extractField(container, ["sanctionNumber", "sanctionOrderReference"]),
    institutionName: extractField(container, ["institutionName"]),
    adminCarpetAreaSqm: adminCarpet,
    amenitiesCarpetAreaSqm: amenitiesCarpet,
    totalBuiltUpAreaSqm: totalArea,
    sanctioningAuthority: extractField(container, ["sanctioningAuthority", "approvingAuthority"]),
    architectCoaRegistration: extractField(container, ["architectCoaRegistration", "architectCoaRegistrationNumber"]),
  };
}

export function adaptDoc07(container: any): NormalizedDoc07Occupancy {
  return {
    issueDate: extractField(container, ["issueDate"]),
    siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
    occupancyType: extractField(container, ["occupancyType", "occupancyStatus"]),
    buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
    institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
    issuingAuthority: extractField(container, ["issuingAuthority"]),
    certificateNumber: extractField(container, ["certificateNumber", "referenceNumber"]),
    expiryDate: extractField(container, ["expiryDate"]),
  };
}

export function adaptDoc08(container: any): NormalizedDoc08StructuralStability {
  return {
    reviewDate: extractField(container, ["reviewDate", "expiryDate"]),
    siteAddress: extractField(container, ["siteAddress"]),
    engineerName: extractField(container, ["engineerName", "issuingEngineerName"]),
    inspectionDate: extractField(container, ["inspectionDate", "issueDate"]),
    stabilityStatus: extractField(container, ["stabilityStatus", "structuralFitnessConclusion"]),
    buildingAgeYears: extractField(container, ["buildingAgeYears"], (val) => Number(val)),
    certificateNumber: extractField(container, ["certificateNumber", "certificateReferenceNumber"]),
    engineerQualifications: extractField(container, ["engineerQualifications", "engineerQualification"]),
    expiryDate: extractField(container, ["expiryDate", "reviewDate"]),
  };
}

export function adaptDoc09(container: any): NormalizedDoc09FireSafety {
  return {
    issueDate: extractField(container, ["issueDate"]),
    expiryDate: extractField(container, ["expiryDate"]),
    siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
    buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
    institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
    issuingAuthority: extractField(container, ["issuingAuthority"]),
    certificateNumber: extractField(container, ["certificateNumber", "certificateReferenceNumber"]),
  };
}

export function adaptDoc10(container: any): NormalizedDoc10BankFunds {
  const inrField = extractField(container, ["amountInInr"], (val) => Number(val));
  const lakhsField = extractField(container, ["amountInLakhsINR"], (val) => Number(val));

  // Cross-compute: if amountInInr is present (e.g. 12500000), compute amountInLakhsINR = 125
  if (inrField.state === "PRESENT" && inrField.value !== null) {
    if (lakhsField.state !== "PRESENT" || lakhsField.value === null) {
      lakhsField.state = "PRESENT";
      lakhsField.value = inrField.value / 100000;
      lakhsField.rawText = inrField.rawText;
      lakhsField.pageNumber = inrField.pageNumber;
      lakhsField.excerpt = inrField.excerpt;
    }
  } else if (lakhsField.state === "PRESENT" && lakhsField.value !== null) {
    if (inrField.state !== "PRESENT" || inrField.value === null) {
      inrField.state = "PRESENT";
      inrField.value = lakhsField.value * 100000;
      inrField.rawText = lakhsField.rawText;
    }
  }

  return {
    bankName: extractField(container, ["bankName"]),
    branchName: extractField(container, ["branchName"]),
    ifscCode: extractField(container, ["ifscCode"]),
    accountHolderName: extractField(container, ["accountHolderName"]),
    amountInInr: inrField,
    amountInLakhsINR: lakhsField,
    fdrNumber: extractField(container, ["fdrNumber", "accountOrFdrNumber"]),
    maturityDate: extractField(container, ["maturityDate", "fdrMaturityDate"]),
    certificateDate: extractField(container, ["certificateDate", "issueDate"]),
    isUnencumbered: extractField(container, ["isUnencumbered", "isStatedUnencumbered"]),
    lienStatement: extractField(container, ["lienStatement"]),
  };
}

export function adaptDoc11(container: any): NormalizedDoc11Affidavit2 {
  return {
    deponentName: extractField(container, ["deponentName"]),
    executionDate: extractField(container, ["executionDate"]),
    placeOfExecution: extractField(container, ["placeOfExecution"]),
    trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName"]),
    proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
  };
}

export function adaptDoc14(container: any): NormalizedDoc14SiteMap {
  return {
    latitude: extractField(container, ["latitude"], (val) => Number(val)),
    longitude: extractField(container, ["longitude"], (val) => Number(val)),
    siteAddress: extractField(container, ["siteAddress"]),
    khasraNumbers: extractField(container, ["khasraNumbers"]),
    proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
  };
}
