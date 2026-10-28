/**
 * Expected VLM Schema Fields per Statutory Document Category
 *
 * Derived strictly from backend extraction-adapter.ts and extraction.schema.ts.
 */

export interface ExpectedFieldDefinition {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "date";
  isCrucialForScrutiny: boolean;
}

export const EXPECTED_DOCUMENT_FIELDS: Record<string, ExpectedFieldDefinition[]> = {
  DOC_01_REGISTRATION: [
    { key: "trustSocietyName", label: "Applicant / Society Name", description: "Legal name of registered applicant entity", type: "string", isCrucialForScrutiny: true },
    { key: "entityType", label: "Entity Constitution Type", description: "Trust, Society, or Section 8 Company", type: "string", isCrucialForScrutiny: true },
    { key: "registrationNumber", label: "Registration Reference Number", description: "Statutory registration number from issuing registrar", type: "string", isCrucialForScrutiny: true },
    { key: "registrationDate", label: "Registration Date", description: "Date entity was registered", type: "date", isCrucialForScrutiny: true },
    { key: "registeringAuthority", label: "Registering Authority", description: "Office of the Sub-Registrar / Charity Commissioner / MCA", type: "string", isCrucialForScrutiny: false },
    { key: "registeredAddress", label: "Registered Office Address", description: "Official registered office location", type: "string", isCrucialForScrutiny: false },
    { key: "hasNonProfitClause", label: "Non-Profit Clause Present", description: "Explicit irrevocable non-profit / public welfare clause", type: "boolean", isCrucialForScrutiny: true },
  ],
  DOC_02_RESOLUTION: [
    { key: "sponsoringBodyName", label: "Sponsoring Body Name", description: "Name of trust/society passing resolution", type: "string", isCrucialForScrutiny: true },
    { key: "proposedInstitutionName", label: "Proposed Institution Name", description: "Statutory name of proposed technical institution", type: "string", isCrucialForScrutiny: true },
    { key: "resolutionNumber", label: "Resolution Number", description: "Format 3 governing board resolution reference", type: "string", isCrucialForScrutiny: true },
    { key: "resolutionDate", label: "Resolution Date", description: "Date governing body approved establishment", type: "date", isCrucialForScrutiny: true },
    { key: "locationAddress", label: "Proposed Campus Location", description: "Demarcated address approved for campus site", type: "string", isCrucialForScrutiny: false },
    { key: "authorizedSignatories", label: "Authorized Signatories", description: "Designated officials executing statutory submissions", type: "string", isCrucialForScrutiny: false },
    { key: "proposedIntake", label: "Approved Annual Intake", description: "Total intake approved by governing body", type: "number", isCrucialForScrutiny: true },
    { key: "hasResourceCommitment", label: "Resource Commitment Clause", description: "Explicit allocation of land, buildings, and funds", type: "boolean", isCrucialForScrutiny: true },
  ],
  DOC_03_LAND_DEED: [
    { key: "documentType", label: "Deed Classification", description: "Registered Sale Deed, Gift Deed, or Govt Lease Deed", type: "string", isCrucialForScrutiny: true },
    { key: "buyerTransferee", label: "Purchaser / Lessee (Transferee)", description: "Must be in the name of applicant Trust/Society", type: "string", isCrucialForScrutiny: true },
    { key: "sellerTransferor", label: "Transferor / Vendor", description: "Executing seller or lessor entity", type: "string", isCrucialForScrutiny: false },
    { key: "landAreaAcres", label: "Land Area (Acres)", description: "Registered acreage of campus site", type: "number", isCrucialForScrutiny: true },
    { key: "khasraNumbers", label: "Khasra / Survey Numbers", description: "Demarcated survey/plot identification numbers", type: "string", isCrucialForScrutiny: true },
    { key: "registrationNumber", label: "Deed Registration Number", description: "Official book/volume/deed registration number", type: "string", isCrucialForScrutiny: true },
    { key: "registrationDate", label: "Registration Date", description: "Date registered before Sub-Registrar", type: "date", isCrucialForScrutiny: true },
    { key: "registrarOffice", label: "Sub-Registrar Jurisdiction", description: "Sub-Registrar office having local jurisdiction", type: "string", isCrucialForScrutiny: false },
    { key: "leaseTenureYears", label: "Lease Tenure (Years)", description: "Minimum 30 years required if leasehold", type: "number", isCrucialForScrutiny: true },
    { key: "leaseExpiryDate", label: "Lease Expiry Date", description: "Expiration date of registered lease", type: "date", isCrucialForScrutiny: true },
  ],
  DOC_04_LEASE_AFFIDAVIT: [
    { key: "deponentName", label: "Deponent Name", description: "Authorized representative executing affidavit", type: "string", isCrucialForScrutiny: false },
    { key: "isApplicable", label: "Govt Lease Applicability", description: "Confirms land leased from Government / Central Agency", type: "boolean", isCrucialForScrutiny: true },
    { key: "executionDate", label: "Execution Date", description: "Date sworn before judicial magistrate / notary", type: "date", isCrucialForScrutiny: true },
    { key: "khasraNumbers", label: "Survey / Khasra Numbers", description: "Identified land plots", type: "string", isCrucialForScrutiny: false },
    { key: "hasIrrevocableCommitment", label: "30-Year Irrevocable Commitment", description: "Statutory undertaking of minimum 30-year lease", type: "boolean", isCrucialForScrutiny: true },
  ],
  DOC_05_LAND_USE: [
    { key: "orderNumber", label: "CLU Order Number", description: "Official change of land use conversion order number", type: "string", isCrucialForScrutiny: true },
    { key: "issueDate", label: "Order Issue Date", description: "Date of revenue authority order", type: "date", isCrucialForScrutiny: true },
    { key: "permittedUse", label: "Permitted Use", description: "Must permit Educational / Institutional purposes", type: "string", isCrucialForScrutiny: true },
    { key: "applicantName", label: "Applicant Name", description: "Entity in whose favor conversion is ordered", type: "string", isCrucialForScrutiny: true },
    { key: "landAreaAcres", label: "Permitted Land Area (Acres)", description: "Area permitted for institutional construction", type: "number", isCrucialForScrutiny: true },
    { key: "issuingAuthority", label: "Issuing Revenue Authority", description: "District Collector / Sub-Divisional Magistrate", type: "string", isCrucialForScrutiny: true },
  ],
  DOC_06_BUILDING_PLAN: [
    { key: "institutionName", label: "Institution Name on Plan", description: "Name as approved in municipal blueprints", type: "string", isCrucialForScrutiny: true },
    { key: "sanctionNumber", label: "Sanction / Approval Number", description: "Building approval reference from local authority", type: "string", isCrucialForScrutiny: true },
    { key: "sanctionDate", label: "Sanction Date", description: "Date plan was formally approved", type: "date", isCrucialForScrutiny: true },
    { key: "sanctioningAuthority", label: "Sanctioning Authority", description: "Municipal Corporation / Town Development Authority", type: "string", isCrucialForScrutiny: true },
    { key: "architectName", label: "Licensed Architect Name", description: "Architect executing blueprints", type: "string", isCrucialForScrutiny: false },
    { key: "architectCoaRegistration", label: "CoA Registration Number", description: "Council of Architecture roll registration (CA/YYYY/NNNNN)", type: "string", isCrucialForScrutiny: true },
    { key: "totalBuiltUpAreaSqm", label: "Total Built-up Area (sq.m)", description: "Total constructed area across all institutional blocks", type: "number", isCrucialForScrutiny: true },
    { key: "adminCarpetAreaSqm", label: "Administrative Area (sq.m)", description: "Office, board room, and administrative space", type: "number", isCrucialForScrutiny: true },
    { key: "amenitiesCarpetAreaSqm", label: "Amenities Area (sq.m)", description: "Canteen, sports, and student common amenity space", type: "number", isCrucialForScrutiny: true },
    { key: "farFsi", label: "FAR / FSI Ratio", description: "Approved floor area ratio for site", type: "number", isCrucialForScrutiny: false },
  ],
  DOC_07_OCCUPANCY: [
    { key: "certificateNumber", label: "Certificate Number", description: "Form D / Building completion certificate reference", type: "string", isCrucialForScrutiny: true },
    { key: "issueDate", label: "Issue Date", description: "Date occupancy was granted", type: "date", isCrucialForScrutiny: true },
    { key: "occupancyType", label: "Occupancy Classification", description: "Permanent, Provisional, or Partial occupancy", type: "string", isCrucialForScrutiny: true },
    { key: "buildingDetails", label: "Covered Blocks / Floors", description: "Demarcated buildings certified as fit for use", type: "string", isCrucialForScrutiny: false },
    { key: "issuingAuthority", label: "Issuing Authority", description: "Competent municipal or development body", type: "string", isCrucialForScrutiny: true },
  ],
  DOC_08_STRUCTURAL_STABILITY: [
    { key: "certificateNumber", label: "Certificate Number", description: "Structural inspection certificate reference", type: "string", isCrucialForScrutiny: true },
    { key: "engineerName", label: "Structural Engineer Name", description: "Chartered/Licensed engineer certifying structure", type: "string", isCrucialForScrutiny: true },
    { key: "engineerQualifications", label: "Engineer Credentials", description: "Licensing body and professional qualification", type: "string", isCrucialForScrutiny: false },
    { key: "stabilityStatus", label: "Stability Finding", description: "Fit and stable for educational occupancy", type: "string", isCrucialForScrutiny: true },
    { key: "buildingAgeYears", label: "Building Age (Years)", description: "Age of structure (>30 years requires enhanced test)", type: "number", isCrucialForScrutiny: true },
    { key: "reviewDate", label: "Review / Issue Date", description: "Date of structural audit", type: "date", isCrucialForScrutiny: true },
  ],
  DOC_09_FIRE_SAFETY: [
    { key: "certificateNumber", label: "Fire Safety NOC Number", description: "Statutory NOC reference from fire services", type: "string", isCrucialForScrutiny: true },
    { key: "issueDate", label: "Issue Date", description: "Date fire certificate was granted", type: "date", isCrucialForScrutiny: true },
    { key: "expiryDate", label: "Expiry Date / Validity", description: "Date fire NOC expires (must be unexpired)", type: "date", isCrucialForScrutiny: true },
    { key: "isCompliant", label: "Compliance Finding", description: "Statutory finding confirming fire safety measures", type: "boolean", isCrucialForScrutiny: true },
    { key: "issuingAuthority", label: "Issuing Fire Authority", description: "State Fire and Emergency Services Directorate", type: "string", isCrucialForScrutiny: true },
  ],
  DOC_10_BANK_FUNDS: [
    { key: "bankName", label: "Scheduled Commercial Bank", description: "Name of scheduled bank holding deposit", type: "string", isCrucialForScrutiny: true },
    { key: "branchName", label: "Branch Name", description: "Issuing branch location", type: "string", isCrucialForScrutiny: false },
    { key: "ifscCode", label: "IFSC Code", description: "Branch identification code", type: "string", isCrucialForScrutiny: false },
    { key: "accountHolderName", label: "Account Holder Name", description: "Must match applicant Trust/Society name", type: "string", isCrucialForScrutiny: true },
    { key: "fdrNumber", label: "FDR / Deposit Receipt Number", description: "Fixed deposit receipt or account reference", type: "string", isCrucialForScrutiny: true },
    { key: "amountInLakhsINR", label: "Deposit Amount (Lakhs INR)", description: "Min ₹100L for Engg, ₹50L for other technical", type: "number", isCrucialForScrutiny: true },
    { key: "certificateDate", label: "Certificate Date", description: "Date certificate was issued by branch manager", type: "date", isCrucialForScrutiny: true },
    { key: "isUnencumbered", label: "Unencumbered Status", description: "Confirmed free of lien, charge, or encumbrance", type: "boolean", isCrucialForScrutiny: true },
    { key: "lienStatement", label: "Lien / Pledge Statement", description: "Branch declaration regarding third-party encumbrances", type: "string", isCrucialForScrutiny: true },
  ],
  DOC_11_AFFIDAVIT_2: [
    { key: "deponentName", label: "Deponent Name", description: "Authorized trustee or chairman executing affidavit", type: "string", isCrucialForScrutiny: true },
    { key: "trustSocietyName", label: "Trust / Society Name", description: "Applicant sponsoring body", type: "string", isCrucialForScrutiny: true },
    { key: "proposedInstitutionName", label: "Proposed Institution Name", description: "Institution name sworn in undertaking", type: "string", isCrucialForScrutiny: true },
    { key: "executionDate", label: "Execution Date", description: "Date attested before notary public / magistrate", type: "date", isCrucialForScrutiny: true },
    { key: "placeOfExecution", label: "Place of Execution", description: "Jurisdiction where e-stamp was attested", type: "string", isCrucialForScrutiny: false },
  ],
  DOC_14_SITE_MAP: [
    { key: "proposedInstitutionName", label: "Institution Name on Site Map", description: "Name on master layout drawing", type: "string", isCrucialForScrutiny: true },
    { key: "khasraNumbers", label: "Survey / Khasra Numbers", description: "Boundary survey numbers shown on layout", type: "string", isCrucialForScrutiny: true },
    { key: "latitude", label: "GPS Latitude", description: "Geo-coordinates of site center", type: "number", isCrucialForScrutiny: false },
    { key: "longitude", label: "GPS Longitude", description: "Geo-coordinates of site center", type: "number", isCrucialForScrutiny: false },
  ],
};
