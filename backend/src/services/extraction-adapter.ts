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

  const containerKeys = Object.keys(container);
  const cleanKey = (s: string) => s.replace(/[-_\s]/g, "").toLowerCase();

  for (const targetKey of candidateKeys) {
    let resolvedKey: string | undefined = undefined;

    // 1. Exact match
    if (targetKey in container) {
      resolvedKey = targetKey;
    } else {
      // 2. Case-insensitive match
      const targetLower = targetKey.toLowerCase();
      resolvedKey = containerKeys.find((k) => k.toLowerCase() === targetLower);

      // 3. Cleaned match (no underscores/hyphens/spaces)
      if (!resolvedKey) {
        const targetClean = cleanKey(targetKey);
        resolvedKey = containerKeys.find((k) => cleanKey(k) === targetClean);
      }
    }

    if (resolvedKey) {
      const fieldObj = container[resolvedKey];
      if (fieldObj !== undefined && fieldObj !== null) {
        // Case A: ExtractedField envelope { state, value, rawText, ... }
        if (typeof fieldObj === "object" && "state" in fieldObj) {
          const rawVal = fieldObj.value;
          const transformedVal =
            transform && rawVal !== null && rawVal !== undefined
              ? transform(rawVal)
              : ((rawVal as T) ?? null);

          return {
            state: fieldObj.state || (rawVal !== null && rawVal !== undefined ? "PRESENT" : "NOT_FOUND"),
            value: transformedVal,
            rawText: fieldObj.rawText ?? (rawVal !== null ? String(rawVal) : null),
            pageNumber: fieldObj.pageNumber ?? null,
            excerpt: fieldObj.excerpt ?? null,
            uncertaintyReason: fieldObj.uncertaintyReason ?? null,
            sourceKey: resolvedKey,
          };
        }

        // Case B: Direct primitive value
        const transformedVal = transform ? transform(fieldObj) : ((fieldObj as T) ?? null);
        return {
          state: "PRESENT",
          value: transformedVal,
          rawText: String(fieldObj),
          pageNumber: null,
          excerpt: String(fieldObj),
          uncertaintyReason: null,
          sourceKey: resolvedKey,
        };
      }
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
  proposedIntake: NormalizedField<number>;
  hasResourceCommitment: NormalizedField<boolean>;
  resourceCommitmentText: NormalizedField<string>;
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
  landOwnershipStatus: NormalizedField<string>;
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
  isCompliant: NormalizedField<boolean>;
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
    entityType: extractField(container, ["applicantType", "entityType", "constitutionType", "trustType", "entityLegalType"]),
    trustSocietyName: extractField(container, ["applicantName", "trustSocietyName", "applicantLegalName", "societyName", "trustName"]),
    registrationNumber: extractField(container, ["registrationNumber", "registrationReferenceNumber", "regNumber", "societyRegistrationNumber"]),
    registrationDate: extractField(container, ["registrationDate", "dateOfRegistration", "registeredDate"]),
    registeringAuthority: extractField(container, ["issuingAuthority", "registeringAuthority", "registrationAuthority", "registrarAuthority"]),
    registeredAddress: extractField(container, ["registeredAddress", "registeredOfficeAddress", "address"]),
    hasNonProfitClause: extractField(container, ["hasNonProfitClause", "isNonProfit"]),
  };
}

export function adaptDoc02(container: any): NormalizedDoc02Resolution {
  return {
    trustSocietyName: extractField(container, ["applicantName", "trustSocietyName", "sponsoringBodyName", "societyName"]),
    proposedInstitutionName: extractField(container, ["proposedInstitutionName", "institutionName"]),
    resolutionDate: extractField(container, ["resolutionDate", "dateOfMeeting"]),
    resolutionNumber: extractField(container, ["resolutionReferenceNumber", "resolutionNumber", "resolutionRefNumber"]),
    locationAddress: extractField(container, ["meetingLocation", "locationAddress", "siteAddress", "institutionAddress"]),
    authorizedSignatories: extractField(container, ["authorizedSignatories", "authorisedSignatories", "signatories"]),
    proposedCoursesIntake: extractField(container, ["proposedCoursesIntake", "programmesStated", "coursesAndIntake"]),
    proposedIntake: extractField(container, ["proposedIntake", "intake"], (v) => Number(v)),
    hasResourceCommitment: extractField(container, ["hasResourceCommitment", "resourceCommitment"]),
    resourceCommitmentText: extractField(container, ["resourceCommitmentText", "committedResources"]),
  };
}

export function adaptDoc03(container: any): NormalizedDoc03LandDeed {
  return {
    documentType: extractField(container, ["deedType", "documentType", "natureOfDeed"]),
    landLocation: extractField(container, ["landLocation", "landRevenueLocation", "siteAddress", "locationOfLand"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers", "surveyNumbers", "plotNumbers"]),
    landAreaAcres: extractField(container, ["totalAreaAcres", "landAreaAcres", "parcelArea", "areaAcres"], (val) => Number(val)),
    buyerTransferee: extractField(container, ["transfereeName", "buyerTransferee", "transfereeLesseeName", "purchaser"]),
    sellerTransferor: extractField(container, ["transferorName", "sellerTransferor", "transferorLessorName", "vendor"]),
    registrationNumber: extractField(container, ["registrationReferenceNumber", "registrationNumber", "deedRegistrationNumber"]),
    registrationDate: extractField(container, ["registrationDate", "deedDate"]),
    registrarOffice: extractField(container, ["registrationOffice", "registrarOffice", "subRegistrarOffice"]),
    leaseTenureYears: extractField(container, ["leaseTenureYears", "leasePeriodYears", "leaseDurationYears"], (val) => Number(val)),
    leaseExpiryDate: extractField(container, ["leaseExpiryDate", "leaseValidUntilDate"]),
    leaseCommencementDate: extractField(container, ["leaseCommencementDate", "leaseStartDate"]),
  };
}

export function adaptDoc04(container: any): NormalizedDoc04LeaseAffidavit {
  return {
    deponentName: extractField(container, ["deponentName", "executantName"]),
    isApplicable: extractField(container, ["isLeaseApplicable", "isApplicable"]),
    executionDate: extractField(container, ["executionDate", "dateOfExecution"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
    placeOfExecution: extractField(container, ["executionLocation", "placeOfExecution"]),
    trustSocietyName: extractField(container, ["applicantName", "trustSocietyName", "sponsoringBodyName"]),
    hasIrrevocableCommitment: extractField(container, ["hasIrrevocableCommitment", "isIrrevocable"]),
    landOwnershipStatus: extractField(container, ["landOwnershipStatus"]),
  };
}

export function adaptDoc05(container: any): NormalizedDoc05LandUse {
  return {
    issueDate: extractField(container, ["issueDate", "orderDate"]),
    orderNumber: extractField(container, ["orderReferenceNumber", "orderNumber", "orderRefNumber"]),
    landLocation: extractField(container, ["landLocation", "siteAddress", "locationOfLand"]),
    permittedUse: extractField(container, ["permittedUse", "permittedLandUse", "purposeAllowed"]),
    applicantName: extractField(container, ["applicantName", "landownerApplicantName", "trustSocietyName"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
    landAreaAcres: extractField(container, ["landAreaAcres", "totalAreaAcres"], (val) => Number(val)),
    issuingAuthority: extractField(container, ["issuingAuthority", "authorityName"]),
  };
}

export function adaptDoc06(container: any): NormalizedDoc06BuildingPlan {
  // Support flat fields with various casing/abbreviations or nested carpetAreaSummary
  const adminCarpet = extractField(
    container,
    [
      "administrativeCarpetAreaSqM",
      "administrativeCarpetAreaSqm",
      "adminCarpetAreaSqM",
      "adminCarpetAreaSqm",
      "administrativeAreaSqm",
      "adminAreaSqm",
    ],
    (val) => Number(val)
  );

  const amenitiesCarpet = extractField(
    container,
    [
      "amenitiesCarpetAreaSqM",
      "amenitiesCarpetAreaSqm",
      "amenityCarpetAreaSqM",
      "amenityCarpetAreaSqm",
      "amenitiesAreaSqm",
      "amenityAreaSqm",
    ],
    (val) => Number(val)
  );

  const totalArea = extractField(
    container,
    ["totalSanctionedBuiltUpAreaSqm", "totalBuiltUpAreaSqm", "totalSanctionedBuiltUpArea", "totalBuiltUpArea"],
    (val) => Number(val)
  );

  // If nested carpetAreaSummary was populated instead of flat fields
  if (adminCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.administrativeSqM) {
    adminCarpet.state = "PRESENT";
    adminCarpet.value = Number(container.carpetAreaSummary.value.administrativeSqM);
    adminCarpet.rawText = String(container.carpetAreaSummary.value.administrativeSqM);
  }
  if (amenitiesCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.amenitiesSqM) {
    amenitiesCarpet.state = "PRESENT";
    amenitiesCarpet.value = Number(container.carpetAreaSummary.value.amenitiesSqM);
    amenitiesCarpet.rawText = String(container.carpetAreaSummary.value.amenitiesSqM);
  }

  return {
    farFsi: extractField(container, ["fsiFarRatio", "farFsi", "statedFarFsi"], (val) => Number(val)),
    siteAddress: extractField(container, ["siteAddress", "institutionSiteAddress", "campusAddress"]),
    sanctionDate: extractField(container, ["sanctionDate", "approvalDate"]),
    architectName: extractField(container, ["architectName"]),
    sanctionNumber: extractField(container, ["sanctionReferenceNumber", "sanctionNumber", "sanctionOrderReference"]),
    institutionName: extractField(container, ["institutionName", "proposedInstitutionName"]),
    adminCarpetAreaSqm: adminCarpet,
    amenitiesCarpetAreaSqm: amenitiesCarpet,
    totalBuiltUpAreaSqm: totalArea,
    sanctioningAuthority: extractField(container, ["sanctionAuthority", "sanctioningAuthority", "approvingAuthority"]),
    architectCoaRegistration: extractField(container, [
      "architectRegistrationNumber",
      "architectCoaRegistration",
      "architectCoaRegistrationNumber",
      "coaRegistrationNumber",
    ]),
  };
}

export function adaptDoc07(container: any): NormalizedDoc07Occupancy {
  return {
    issueDate: extractField(container, ["issueDate", "dateOfIssue"]),
    siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
    occupancyType: extractField(container, ["occupancyStatus", "occupancyType", "completionType"]),
    buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
    institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
    issuingAuthority: extractField(container, ["issuingAuthority", "competentAuthority"]),
    certificateNumber: extractField(container, ["certificateReferenceNumber", "certificateNumber", "referenceNumber"]),
    expiryDate: extractField(container, ["expiryDate", "validUntilDate"]),
  };
}

export function adaptDoc08(container: any): NormalizedDoc08StructuralStability {
  return {
    reviewDate: extractField(container, ["validUntilDate", "reviewDate", "expiryDate"]),
    siteAddress: extractField(container, ["siteAddress"]),
    engineerName: extractField(container, ["engineerName", "issuingEngineerName"]),
    inspectionDate: extractField(container, ["inspectionDate", "issueDate"]),
    stabilityStatus: extractField(container, ["isStructurallyStable", "stabilityStatus", "structuralFitnessConclusion"], (val) =>
      typeof val === "boolean" ? (val ? "structurally stable" : "unstable") : String(val)
    ),
    buildingAgeYears: extractField(container, ["buildingAgeYears"], (val) => Number(val)),
    certificateNumber: extractField(container, ["certificateReferenceNumber", "certificateNumber"]),
    engineerQualifications: extractField(container, ["engineerQualification", "engineerQualifications"]),
    expiryDate: extractField(container, ["validUntilDate", "expiryDate", "reviewDate"]),
  };
}

export function adaptDoc09(container: any): NormalizedDoc09FireSafety {
  return {
    issueDate: extractField(container, ["issueDate"]),
    expiryDate: extractField(container, ["validUntilDate", "expiryDate", "validTillDate"]),
    siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
    buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
    institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
    issuingAuthority: extractField(container, ["issuingAuthority"]),
    certificateNumber: extractField(container, ["certificateReferenceNumber", "certificateNumber"]),
    isCompliant: extractField(container, ["isCompliant"]),
  };
}

export function adaptDoc10(container: any): NormalizedDoc10BankFunds {
  const inrField = extractField(
    container,
    [
      "principalAmountRupees",
      "amountInInr",
      "principalAmount",
      "amountInRupees",
      "fdrAmount",
      "depositAmount",
      "totalAmountInr",
      "balanceInInr",
    ],
    (val) => Number(val)
  );
  const lakhsField = extractField(
    container,
    ["amountInLakhsINR", "amountInLakhs", "amountLakhs", "principalAmountLakhs"],
    (val) => Number(val)
  );

  // Cross-compute: if amountInInr is present (e.g. 12500000), compute amountInLakhsINR = 125
  if (inrField.state === "PRESENT" && inrField.value !== null && !isNaN(inrField.value)) {
    if (lakhsField.state !== "PRESENT" || lakhsField.value === null) {
      lakhsField.state = "PRESENT";
      lakhsField.value = inrField.value / 100000;
      lakhsField.rawText = inrField.rawText;
      lakhsField.pageNumber = inrField.pageNumber;
      lakhsField.excerpt = inrField.excerpt;
    }
  } else if (lakhsField.state === "PRESENT" && lakhsField.value !== null && !isNaN(lakhsField.value)) {
    if (inrField.state !== "PRESENT" || inrField.value === null) {
      inrField.state = "PRESENT";
      inrField.value = lakhsField.value * 100000;
      inrField.rawText = lakhsField.rawText;
    }
  }

  return {
    bankName: extractField(container, ["bankName", "issuingBank"]),
    branchName: extractField(container, ["branchName"]),
    ifscCode: extractField(container, ["ifscCode"]),
    accountHolderName: extractField(container, ["accountHolderName", "applicantName", "depositorName"]),
    amountInInr: inrField,
    amountInLakhsINR: lakhsField,
    fdrNumber: extractField(container, ["fdrNumber", "accountOrFdrNumber", "fixedDepositNumber"]),
    maturityDate: extractField(container, ["maturityDate", "fdrMaturityDate"]),
    certificateDate: extractField(container, ["certificateDate", "issueDate"]),
    isUnencumbered: extractField(container, ["isUnencumbered", "isStatedUnencumbered"]),
    lienStatement: extractField(container, ["lienStatement"]),
  };
}

export function adaptDoc11(container: any): NormalizedDoc11Affidavit2 {
  return {
    deponentName: extractField(container, ["deponentName", "executantName"]),
    executionDate: extractField(container, ["executionDate", "dateOfExecution"]),
    placeOfExecution: extractField(container, ["executionLocation", "placeOfExecution"]),
    trustSocietyName: extractField(container, ["applicantName", "trustSocietyName", "sponsoringBodyName"]),
    proposedInstitutionName: extractField(container, ["proposedInstitutionName", "institutionName"]),
  };
}

export function adaptDoc14(container: any): NormalizedDoc14SiteMap {
  return {
    latitude: extractField(container, ["latitude", "gpsLatitude"], (val) => Number(val)),
    longitude: extractField(container, ["longitude", "gpsLongitude"], (val) => Number(val)),
    siteAddress: extractField(container, ["siteAddress", "locationAddress"]),
    khasraNumbers: extractField(container, ["khasraNumbers", "surveyNumbers"]),
    proposedInstitutionName: extractField(container, ["institutionName", "proposedInstitutionName"]),
  };
}
