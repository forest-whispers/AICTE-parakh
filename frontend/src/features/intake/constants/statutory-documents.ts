/**
 * PARAKH Statutory Document Category Definitions
 *
 * Derived strictly from backend compliance scrutiny rules (APH Chapter I, Annexure 3.1)
 * and statutory verification engine mappings.
 */

export interface StatutoryDocumentCategory {
  code: string;
  label: string;
  shortLabel: string;
  description: string;
  statutoryClause: string;
  isRequired: boolean;
  acceptedFormats: string[]; // e.g. ["application/pdf", "image/png", "image/jpeg"]
  formatDescription: string;
  defaultIssuingAuthority: string;
  referencePlaceholder: string;
}

export const STATUTORY_DOCUMENT_CATEGORIES: StatutoryDocumentCategory[] = [
  {
    code: "DOC_01_REGISTRATION",
    label: "Society / Trust Registration & MoA",
    shortLabel: "Society registration",
    description: "Certificate of Registration, Trust Deed, or Section 8 Company License along with Memorandum of Association (MoA).",
    statutoryClause: "APH Chapter I, Clause 1.5.1 & Annexure 3.1(a)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF / JPG / PNG (Max 25 MB)",
    defaultIssuingAuthority: "Registrar of Societies / Sub-Registrar / MCA",
    referencePlaceholder: "e.g. SOC/2015/8841 or REG/KA/5512",
  },
  {
    code: "DOC_02_RESOLUTION",
    label: "Governing Body Resolution (Format 3)",
    shortLabel: "Governing body resolution",
    description: "Resolution passed by the sponsoring body in AICTE Format 3 approving the establishment/expansion of the technical institution.",
    statutoryClause: "APH Chapter I, Clause 1.5.2 & Format 3",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Applicant Sponsoring Body",
    referencePlaceholder: "e.g. RES/2026/04/GB",
  },
  {
    code: "DOC_03_LAND_DEED",
    label: "Registered Land Sale / Lease Deed",
    shortLabel: "Land ownership record",
    description: "Registered sale deed, gift deed, or government lease deed (minimum 30 years) in the name of the sponsoring body/institution.",
    statutoryClause: "APH Chapter I, Clause 6.17(b) & Annexure 3.1(b)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF / JPG / PNG (Max 25 MB)",
    defaultIssuingAuthority: "Sub-Registrar / Revenue Department",
    referencePlaceholder: "e.g. KA/DWD/LR/2026/084 or DEED/7741/2018",
  },
  {
    code: "DOC_05_LAND_USE",
    label: "Land Use Certificate / Conversion Order",
    shortLabel: "Land use conversion order",
    description: "Statutory order issued by competent revenue authority (Collector/SDM) permitting conversion for educational/institutional use.",
    statutoryClause: "APH Chapter I, Clause 6.17(d) & Annexure 3.1(c)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "District Collector / Sub-Divisional Magistrate",
    referencePlaceholder: "e.g. REV/CLU/2020/991",
  },
  {
    code: "DOC_06_BUILDING_PLAN",
    label: "Approved Building Plan & Architect Certificate",
    shortLabel: "Architect certificate",
    description: "Approved master building plan signed by a Council of Architecture (CoA) registered architect and municipal authority.",
    statutoryClause: "APH Chapter I, Clause 6.17(e) & Annexure 3.1(d)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Town Planning Authority / Competent Municipal Body",
    referencePlaceholder: "e.g. CA/2012/54891/BP or MUNICIPAL/BLDG/882",
  },
  {
    code: "DOC_07_OCCUPANCY",
    label: "Building Occupancy / Completion Certificate",
    shortLabel: "Occupancy certificate",
    description: "Form D / Occupancy certificate issued by local town planning/municipal authority confirming readiness of built infrastructure.",
    statutoryClause: "APH Chapter I, Clause 6.17(f) & Annexure 3.1(d)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Municipal Corporation / Town Development Authority",
    referencePlaceholder: "e.g. OCC/CORP/2024/311",
  },
  {
    code: "DOC_08_STRUCTURAL_STABILITY",
    label: "Structural Stability Certificate",
    shortLabel: "Structural stability certificate",
    description: "Certificate issued by a licensed structural engineer confirming compliance with National Building Code safety standards.",
    statutoryClause: "APH Chapter I, Clause 6.17(h) & Annexure 3.1(e)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Certified Structural Engineer / PWD",
    referencePlaceholder: "e.g. SEC/STRUC/2025/119",
  },
  {
    code: "DOC_09_FIRE_SAFETY",
    label: "Fire Safety Certificate (NOC)",
    shortLabel: "Fire NOC",
    description: "Active Fire Safety Certificate / No-Objection Certificate issued by the competent State Fire Services Authority.",
    statutoryClause: "APH Chapter I, Clause 6.17(g) & Annexure 3.1(f)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "State Fire and Emergency Services Directorate",
    referencePlaceholder: "e.g. FS/NOC/2026/8812",
  },
  {
    code: "DOC_10_BANK_FUNDS",
    label: "Bank Certificate of Funds / FDR (Certificate 3)",
    shortLabel: "Bank certificate",
    description: "Scheduled commercial bank certificate evidencing unencumbered liquid balance/FDR in the name of the applicant society/institution.",
    statutoryClause: "APH Chapter I, Clause 1.5.3 & Certificate 3",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Scheduled Commercial Bank Branch Manager",
    referencePlaceholder: "e.g. SBI/BNC/CERT3/2026/09",
  },
  {
    code: "DOC_11_AFFIDAVIT_2",
    label: "Statutory Affidavit 2 (General Undertaking)",
    shortLabel: "Statutory Affidavit 2",
    description: "Affidavit executed on e-stamp paper before a Notary Public / First Class Magistrate undertaking adherence to AICTE Approval Process.",
    statutoryClause: "APH Chapter I, Clause 1.5.5 & Format Affidavit-2",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "First Class Judicial Magistrate / Notary Public",
    referencePlaceholder: "e.g. NOTARY/KA/STAMP/2026/44",
  },
  {
    code: "DOC_14_SITE_MAP",
    label: "Approved Site & Master Layout Plan",
    shortLabel: "Site map & layout",
    description: "Demarcated site plan with khasra/survey numbers, contours, and physical boundary certifications.",
    statutoryClause: "APH Chapter I, Annexure 3.1(g, h)",
    isRequired: true,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "Revenue Surveyor / Town Planning Office",
    referencePlaceholder: "e.g. SURV/PLAN/2025/08",
  },
  // Optional / Conditional statutory documents
  {
    code: "DOC_04_LEASE_AFFIDAVIT",
    label: "Government Lease Affidavit (30-Year Tenure)",
    shortLabel: "Government lease affidavit",
    description: "Executed tripartite agreement or statutory affidavit where land is leased from Central/State Government or statutory agency.",
    statutoryClause: "APH Chapter I, Clause 6.17(c)",
    isRequired: false,
    acceptedFormats: ["application/pdf", "image/png", "image/jpeg"],
    formatDescription: "PDF (Max 25 MB)",
    defaultIssuingAuthority: "State Land Allotment Authority",
    referencePlaceholder: "e.g. GOVT/LEASE/2022/105",
  },
];

export const PROGRAM_CATEGORIES = [
  { value: "ENGINEERING_AND_TECHNOLOGY", label: "Engineering & Technology" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "ARCHITECTURE_AND_PLANNING", label: "Architecture & Planning" },
  { value: "APPLIED_ARTS_AND_CRAFTS", label: "Applied Arts & Crafts" },
  { value: "HOTEL_MANAGEMENT_AND_CATERING", label: "Hotel Management & Catering" },
  { value: "OTHER", label: "Other Technical Discipline" },
];
