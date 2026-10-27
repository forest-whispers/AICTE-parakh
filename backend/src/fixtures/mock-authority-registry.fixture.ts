/**
 * Mock Authority Registry Fixture
 *
 * Grounded statutory records representing simulated state and national issuing authorities:
 * 1. State Registrar of Public Trusts & Societies (M.P. Public Trusts Act / Societies Registration)
 * 2. State Revenue Department (Bhulekh Land Title & Section 172 Land Use Conversion Orders)
 * 3. State Directorate of Fire & Emergency Services (Fire Safety e-NOC Portal)
 * 4. Council of Architecture (National Roll of Architects)
 * 5. Bank Branch Core Record Inquiry (Simulated branch responses & recorded letters)
 */

export interface SponsoringBodyRegistryRecord {
  registrationNumber: string;
  legalName: string;
  entityType: string;
  registrationDate: string;
  registeringAuthority: string;
  registeredAddress: string;
  status: "ACTIVE" | "DISSOLVED" | "SUSPENDED";
  hasNonProfitClause: boolean;
  authorizedTrustees: string[];
}

export interface LandRecordRegistryEntry {
  deedRegistrationNumber?: string;
  conversionOrderNumber?: string;
  ownerName: string;
  khasraNumbers: string[];
  district: string;
  tehsil: string;
  village: string;
  totalAreaAcres: number;
  permittedUse: string;
  encumbranceStatus: "NIL" | "ACTIVE_ENCUMBRANCE";
  encumbranceDetails?: string;
  orderDate?: string;
  registrationDate?: string;
}

export interface FireNocRegistryRecord {
  certificateNumber: string;
  institutionName: string;
  siteAddress: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  coveredBlocks: string;
}

export interface ArchitectCoaRecord {
  registrationNumber: string;
  architectName: string;
  registrationStatus: "ACTIVE" | "EXPIRED" | "CANCELLED";
  validUpTo: string;
  qualification: string;
  registeredCity: string;
}

export interface BankBranchConfirmationRecord {
  fdrOrAccountNumber: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  depositAmountLakhsINR: number;
  depositDate: string;
  maturityDate: string;
  isUnencumbered: boolean;
  lienDetails: string | null;
  branchConfirmationStatus: "CONFIRMED" | "LIEN_DETECTED" | "BRANCH_UNRESPONSIVE";
}

// ---------------------------------------------------------------------------
// 1. Sponsoring Body Mock Registry (M.P. Public Trusts & Societies)
// ---------------------------------------------------------------------------
export const MOCK_SPONSORING_BODIES: SponsoringBodyRegistryRecord[] = [
  {
    registrationNumber: "REG/BPL/2015/04882",
    legalName: "Vidyapeeth Educational Trust",
    entityType: "Public Charitable Trust",
    registrationDate: "2015-08-10",
    registeringAuthority: "Registrar of Public Trusts, Bhopal",
    registeredAddress: "Plot 12, Arera Hills, Bhopal, Madhya Pradesh 462011",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Dr. R. K. Sharma", "Shri Suresh Patel"],
  },
  {
    registrationNumber: "REG/BPL/2018/01992",
    legalName: "Pragati Shikshan Samiti",
    entityType: "Society under M.P. Societies Registration Act",
    registrationDate: "2018-05-14",
    registeringAuthority: "Registrar of Societies, Bhopal",
    registeredAddress: "Sector C, Indrapuri, Bhopal, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Er. Alok Verma", "Dr. Meena Saxena"],
  },
  {
    registrationNumber: "REG/GWL/2014/0112",
    legalName: "Surya Technical Foundation",
    entityType: "Section 8 Not-for-Profit Company",
    registrationDate: "2014-03-22",
    registeringAuthority: "Registrar of Companies, Gwalior",
    registeredAddress: "City Centre, Gwalior, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Shri Rajeshwar Rao"],
  },
  {
    // Deliberate name mismatch test: Registered name is 'Sarvodaya Shiksha Parishad'
    registrationNumber: "REG/IND/2016/0991",
    legalName: "Sarvodaya Shiksha Parishad",
    entityType: "Public Charitable Trust",
    registrationDate: "2016-09-19",
    registeringAuthority: "Registrar of Public Trusts, Indore",
    registeredAddress: "Scheme 54, Vijay Nagar, Indore, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Shri Anand Mohan"],
  },
  {
    registrationNumber: "REG/JBP/2017/0441",
    legalName: "Mahakoshal Welfare Society",
    entityType: "Registered Society",
    registrationDate: "2017-02-18",
    registeringAuthority: "Registrar of Societies, Jabalpur",
    registeredAddress: "Civil Lines, Jabalpur, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Dr. K. L. Agrawal"],
  },
  {
    registrationNumber: "REG/UJN/2012/0331",
    legalName: "Ujjain Technical Education Society",
    entityType: "Registered Society",
    registrationDate: "2012-11-05",
    registeringAuthority: "Registrar of Societies, Ujjain",
    registeredAddress: "Freeganj, Ujjain, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Pt. Rameshwar Dubey"],
  },
  {
    registrationNumber: "REG/REW/2019/0772",
    legalName: "Vindhya Knowledge Society",
    entityType: "Registered Society",
    registrationDate: "2019-06-25",
    registeringAuthority: "Registrar of Societies, Rewa",
    registeredAddress: "Kothi Road, Rewa, Madhya Pradesh",
    status: "ACTIVE",
    hasNonProfitClause: true,
    authorizedTrustees: ["Shri Narendra Mishra"],
  },
];

// ---------------------------------------------------------------------------
// 2. State Revenue Department & Bhulekh Land Records
// ---------------------------------------------------------------------------
export const MOCK_LAND_RECORDS: LandRecordRegistryEntry[] = [
  // Scenario 1: Vidyapeeth
  {
    deedRegistrationNumber: "SD/SEH/2019/3321",
    conversionOrderNumber: "REV/LUC/2020/0142",
    ownerName: "Vidyapeeth Educational Trust",
    khasraNumbers: ["201/1"],
    district: "Sehore",
    tehsil: "Sehore",
    village: "Village Rampur",
    totalAreaAcres: 8.5,
    permittedUse: "Educational and institutional purposes",
    encumbranceStatus: "NIL",
    registrationDate: "2019-11-20",
    orderDate: "2020-04-12",
  },
  // Scenario 2: Pragati
  {
    deedRegistrationNumber: "SD/BPL/2021/1109",
    conversionOrderNumber: "REV/LUC/2021/0088",
    ownerName: "Pragati Shikshan Samiti",
    khasraNumbers: ["102/2"],
    district: "Bhopal",
    tehsil: "Huzur",
    village: "Village Kolar",
    totalAreaAcres: 4.0,
    permittedUse: "Educational institutional use",
    encumbranceStatus: "NIL",
    registrationDate: "2021-03-15",
    orderDate: "2021-08-20",
  },
  // Scenario 3: Surya
  {
    deedRegistrationNumber: "SD/GWL/2020/0912",
    conversionOrderNumber: "REV/LUC/2020/0411",
    ownerName: "Surya Technical Foundation",
    khasraNumbers: ["55/1", "55/2"],
    district: "Gwalior",
    tehsil: "Gwalior",
    village: "Village Morar",
    totalAreaAcres: 8.0,
    permittedUse: "Technical Education Institute",
    encumbranceStatus: "NIL",
    registrationDate: "2020-02-10",
    orderDate: "2020-07-15",
  },
  // Scenario 4: Zenith / Sunrise Mismatch (Recorded owner in Sub-Registrar records is 'Zenith Welfare & Educational Foundation', not Sunrise Commercial)
  {
    deedRegistrationNumber: "BPL/2019/1004",
    conversionOrderNumber: "REV/LUC/2020/0712",
    ownerName: "Zenith Welfare & Educational Foundation",
    khasraNumbers: ["45/1"],
    district: "Bhopal",
    tehsil: "Huzur",
    village: "Village Sonagiri",
    totalAreaAcres: 8.0,
    permittedUse: "Educational Institutional Use",
    encumbranceStatus: "NIL",
    registrationDate: "2019-09-14",
    orderDate: "2020-02-18",
  },
  // Scenario 5: Mahakoshal Multi-parcel
  {
    deedRegistrationNumber: "SD/JBP/2022/1982",
    conversionOrderNumber: "REV/LUC/2022/0881",
    ownerName: "Mahakoshal Welfare Society",
    khasraNumbers: ["88/1", "88/2"],
    district: "Jabalpur",
    tehsil: "Panagar",
    village: "Village Maharajpur",
    totalAreaAcres: 7.8,
    permittedUse: "Institutional campus",
    encumbranceStatus: "NIL",
    registrationDate: "2022-04-18",
    orderDate: "2022-10-10",
  },
  // Scenario 7: Ujjain
  {
    deedRegistrationNumber: "SD/UJN/2021/0551",
    conversionOrderNumber: "REV/LUC/2022/0114",
    ownerName: "Ujjain Technical Education Society",
    khasraNumbers: ["44/1"],
    district: "Ujjain",
    tehsil: "Ujjain",
    village: "Village Nanakheda",
    totalAreaAcres: 8.0,
    permittedUse: "Educational Establishment",
    encumbranceStatus: "NIL",
    registrationDate: "2021-08-11",
    orderDate: "2022-03-05",
  },
  // Scenario 8: Rewa Encumbered
  {
    deedRegistrationNumber: "SD/REW/2021/0192",
    conversionOrderNumber: "REV/LUC/2021/0501",
    ownerName: "Vindhya Knowledge Society",
    khasraNumbers: ["88/1"],
    district: "Rewa",
    tehsil: "Huzur",
    village: "Village Chorhata",
    totalAreaAcres: 9.0,
    permittedUse: "Technical Education Institute",
    encumbranceStatus: "NIL",
    registrationDate: "2021-05-19",
    orderDate: "2021-11-22",
  },
];

// ---------------------------------------------------------------------------
// 3. State Directorate of Fire and Emergency Services
// ---------------------------------------------------------------------------
export const MOCK_FIRE_NOCS: FireNocRegistryRecord[] = [
  {
    certificateNumber: "FS/NOC/2026/0219",
    institutionName: "Vidyapeeth Institute of Technology and Science",
    siteAddress: "Village Rampur, Tehsil Sehore, District Sehore, Madhya Pradesh",
    issuingAuthority: "Fire Services Headquarters, Sehore Region",
    issueDate: "2026-02-01",
    expiryDate: "2027-02-01",
    status: "ACTIVE",
    coveredBlocks: "Blocks A and B",
  },
  {
    certificateNumber: "FS/NOC/2026/0881",
    institutionName: "Pragati Institute of Technology",
    siteAddress: "Village Kolar, Tehsil Huzur, District Bhopal, Madhya Pradesh",
    issuingAuthority: "Directorate of Fire Services, Bhopal Region",
    issueDate: "2026-05-10",
    expiryDate: "2027-05-10",
    status: "ACTIVE",
    coveredBlocks: "Instructional Block",
  },
  {
    // Expired Fire NOC scenario (Scenario 6)
    certificateNumber: "FS/RTL/2024/01",
    institutionName: "Horizon Institute of Technology",
    siteAddress: "Plot 5, Industrial Area, Ratlam",
    issuingAuthority: "Fire Services, Ratlam",
    issueDate: "2024-06-01",
    expiryDate: "2024-01-15",
    status: "EXPIRED",
    coveredBlocks: "Instructional Block",
  },
  {
    // Expired Fire NOC scenario
    certificateNumber: "FS/NOC/2023/0112",
    institutionName: "Surya Institute of Technology",
    siteAddress: "Village Morar, Tehsil Gwalior, District Gwalior, Madhya Pradesh",
    issuingAuthority: "Municipal Fire Brigade, Gwalior",
    issueDate: "2023-04-01",
    expiryDate: "2024-03-31",
    status: "EXPIRED",
    coveredBlocks: "Main Academic Building",
  },
  {
    certificateNumber: "FS/NOC/2026/0334",
    institutionName: "Sarvodaya Institute of Engineering",
    siteAddress: "Village Manglia, Tehsil Sanwer, District Indore, Madhya Pradesh",
    issuingAuthority: "Indore Fire Safety Command",
    issueDate: "2026-01-15",
    expiryDate: "2027-01-15",
    status: "ACTIVE",
    coveredBlocks: "Academic and Administrative Wing",
  },
  {
    certificateNumber: "FS/NOC/2026/0773",
    institutionName: "Mahakoshal Institute of Technology",
    siteAddress: "Village Maharajpur, Tehsil Panagar, District Jabalpur, Madhya Pradesh",
    issuingAuthority: "Fire Safety Division, Jabalpur",
    issueDate: "2026-03-10",
    expiryDate: "2027-03-10",
    status: "ACTIVE",
    coveredBlocks: "Instructional Block 1 and 2",
  },
  {
    certificateNumber: "FS/NOC/2026/0912",
    institutionName: "Mahakal Institute of Engineering",
    siteAddress: "Village Nanakheda, Tehsil Ujjain, District Ujjain, Madhya Pradesh",
    issuingAuthority: "Ujjain Municipal Fire Department",
    issueDate: "2026-04-20",
    expiryDate: "2027-04-20",
    status: "ACTIVE",
    coveredBlocks: "Main Complex",
  },
  {
    certificateNumber: "FS/NOC/2026/0448",
    institutionName: "Vindhya Engineering College",
    siteAddress: "Village Chorhata, Tehsil Huzur, District Rewa, Madhya Pradesh",
    issuingAuthority: "Rewa District Fire Authority",
    issueDate: "2026-02-18",
    expiryDate: "2027-02-18",
    status: "ACTIVE",
    coveredBlocks: "Phase-1 Academic Blocks",
  },
];

// ---------------------------------------------------------------------------
// 4. Council of Architecture (CoA) National Roll
// ---------------------------------------------------------------------------
export const MOCK_COA_ROLL: ArchitectCoaRecord[] = [
  {
    registrationNumber: "CA/2012/55443",
    architectName: "Ar. Rajesh Verma",
    registrationStatus: "ACTIVE",
    validUpTo: "2029-12-31",
    qualification: "B.Arch (SPA Delhi), AIIA",
    registeredCity: "Bhopal",
  },
  {
    registrationNumber: "CA/2015/66120",
    architectName: "Ar. Vikram Joshi",
    registrationStatus: "ACTIVE",
    validUpTo: "2030-12-31",
    qualification: "B.Arch (MANIT Bhopal)",
    registeredCity: "Bhopal",
  },
  {
    registrationNumber: "CA/2008/41190",
    architectName: "Ar. Sunita Rao",
    registrationStatus: "ACTIVE",
    validUpTo: "2028-12-31",
    qualification: "B.Arch, M.Arch (Urban Design)",
    registeredCity: "Gwalior",
  },
  {
    registrationNumber: "CA/2010/48911",
    architectName: "Ar. Deepesh Tiwari",
    registrationStatus: "ACTIVE",
    validUpTo: "2031-12-31",
    qualification: "B.Arch",
    registeredCity: "Indore",
  },
  {
    registrationNumber: "CA/2014/61192",
    architectName: "Ar. Sneha Kulkarni",
    registrationStatus: "ACTIVE",
    validUpTo: "2029-06-30",
    qualification: "B.Arch",
    registeredCity: "Jabalpur",
  },
  {
    registrationNumber: "CA/2018/88219",
    architectName: "Ar. Pradeep Chouhan",
    registrationStatus: "ACTIVE",
    validUpTo: "2032-12-31",
    qualification: "B.Arch",
    registeredCity: "Ujjain",
  },
  {
    registrationNumber: "CA/2016/74102",
    architectName: "Ar. Ananya Sen",
    registrationStatus: "ACTIVE",
    validUpTo: "2030-03-31",
    qualification: "B.Arch",
    registeredCity: "Rewa",
  },
];

// ---------------------------------------------------------------------------
// 5. Bank Branch Confirmation Mock Records (Simulated Branch Responses)
// ---------------------------------------------------------------------------
export const MOCK_BANK_CONFIRMATIONS: BankBranchConfirmationRecord[] = [
  // Scenario 1: State Bank of India, Sehore Main Branch - Unencumbered ₹150 Lakhs
  {
    fdrOrAccountNumber: "FDR/39881029481",
    bankName: "State Bank of India",
    branchName: "Sehore Main Branch",
    accountHolderName: "Vidyapeeth Educational Trust",
    depositAmountLakhsINR: 150,
    depositDate: "2026-08-10",
    maturityDate: "2027-08-10",
    isUnencumbered: true,
    lienDetails: null,
    branchConfirmationStatus: "CONFIRMED",
  },
  // Scenario 2: Punjab National Bank - ₹60 Lakhs
  {
    fdrOrAccountNumber: "FDR/40991200192",
    bankName: "Punjab National Bank",
    branchName: "Kolar Road Branch, Bhopal",
    accountHolderName: "Pragati Shikshan Samiti",
    depositAmountLakhsINR: 60,
    depositDate: "2026-07-20",
    maturityDate: "2027-07-20",
    isUnencumbered: true,
    lienDetails: null,
    branchConfirmationStatus: "CONFIRMED",
  },
  // Scenario 3: Bank of Baroda - ₹120 Lakhs
  {
    fdrOrAccountNumber: "FDR/55120938471",
    bankName: "Bank of Baroda",
    branchName: "City Centre Branch, Gwalior",
    accountHolderName: "Surya Technical Foundation",
    depositAmountLakhsINR: 120,
    depositDate: "2026-08-01",
    maturityDate: "2027-08-01",
    isUnencumbered: true,
    lienDetails: null,
    branchConfirmationStatus: "CONFIRMED",
  },
  // Scenario 4: HDFC Bank - ₹110 Lakhs
  {
    fdrOrAccountNumber: "FDR/66192837461",
    bankName: "HDFC Bank",
    branchName: "Vijay Nagar Branch, Indore",
    accountHolderName: "Sarvodaya Shiksha Parishad",
    depositAmountLakhsINR: 110,
    depositDate: "2026-08-12",
    maturityDate: "2027-08-12",
    isUnencumbered: true,
    lienDetails: null,
    branchConfirmationStatus: "CONFIRMED",
  },
  // Scenario 8: Encumbered deposit - Bank of Baroda / Canara Bank has an active lien marked!
  {
    fdrOrAccountNumber: "FDR/38119028472",
    bankName: "Bank of Baroda",
    branchName: "Bhopal Main",
    accountHolderName: "National Engineering Research Trust",
    depositAmountLakhsINR: 35,
    depositDate: "2026-07-15",
    maturityDate: "2027-07-15",
    isUnencumbered: false,
    lienDetails: "FDR pledged under lien to State Construction Corporation against credit facility",
    branchConfirmationStatus: "LIEN_DETECTED",
  },
];
