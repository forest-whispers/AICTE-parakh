import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
export class ComplianceService {
    /**
     * Evaluates deterministic APH compliance rules for an application.
     */
    async evaluateApplication(applicationId, customEvaluationDate) {
        const evaluationDate = customEvaluationDate || new Date();
        const evalDateISO = evaluationDate.toISOString();
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                documents: true,
            },
        });
        if (!application) {
            throw new Error(`Application ${applicationId} not found.`);
        }
        // Helper map of documents by classifiedType
        const docs = application.documents;
        const envelopesByDocId = new Map();
        const docsByType = new Map();
        for (const d of docs) {
            const envelope = d.extractedData;
            if (envelope && d.extractionStatus === "SUCCESS") {
                envelopesByDocId.set(d.id, envelope);
                const classified = envelope.classifiedType || d.documentType;
                const list = docsByType.get(classified) || [];
                list.push({ id: d.id, originalName: d.originalName, filePath: d.filePath, envelope });
                docsByType.set(classified, list);
            }
            else {
                const list = docsByType.get(d.documentType) || [];
                list.push({ id: d.id, originalName: d.originalName, filePath: d.filePath });
                docsByType.set(d.documentType, list);
            }
        }
        const findings = [];
        // Helper to get first document envelope of a given type
        const getFirstEnvelope = (type) => {
            const list = docsByType.get(type);
            if (list && list.length > 0 && list[0]?.envelope) {
                return { docId: list[0].id, envelope: list[0].envelope };
            }
            return null;
        };
        // Helper to build Evidence object
        const makeEvidence = (docId, docType, fieldName, fieldObj) => {
            return {
                documentId: docId,
                documentType: docType,
                fieldName,
                rawText: fieldObj?.rawText ?? null,
                extractedValue: fieldObj?.value ?? null,
                pageNumber: fieldObj?.pageNumber ?? null,
                excerpt: fieldObj?.excerpt ?? null,
            };
        };
        // --- RULE 1: Proposed Institution Name Screening (Clause 1.5.4) ---
        (() => {
            const ruleId = "RULE_NAME_PROHIBITED_WORDS";
            const ruleName = "Screening of Proposed Institution Name";
            const aphClause = "Chapter I, Clause 1.5.4 (PDF p. 5)";
            const prohibitedAcronyms = ["IIT", "IIM", "IISC", "NIT", "IISER", "IIIT", "IIEST", "AICTE", "UGC", "MOE", "GOI"];
            const protectedTerms = ["GOVERNMENT", "INDIA", "INDIAN", "NATIONAL", "ALL INDIA", "COMMISSION"];
            const nameToTest = application.institutionName?.trim();
            if (!nameToTest) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "INSUFFICIENT_INPUT",
                    severity: "CRITICAL",
                    summary: "Institution name not provided in application profile.",
                    details: "A valid proposed institution name is required for statutory name screening.",
                    evidence: [],
                });
                return;
            }
            const upper = nameToTest.toUpperCase();
            const tokens = upper.split(/[\s,./\-_()]+/);
            const matchedAcronyms = prohibitedAcronyms.filter((a) => tokens.includes(a));
            const matchedTerms = protectedTerms.filter((t) => upper.includes(t));
            if (matchedAcronyms.length > 0 || matchedTerms.length > 0) {
                const matches = [...matchedAcronyms, ...matchedTerms].join(", ");
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: `Proposed name contains prohibited terms or national acronyms: ${matches}.`,
                    details: `AICTE APH Clause 1.5.4 prohibits using protected titles, national acronyms, or words implying Government patronage without statutory entitlement. Detected: ${matches}`,
                    evidence: [
                        {
                            documentId: application.id,
                            documentType: "APPLICATION_METADATA",
                            fieldName: "institutionName",
                            rawText: nameToTest,
                            extractedValue: nameToTest,
                            pageNumber: null,
                            excerpt: `Proposed name: "${nameToTest}"`,
                        },
                    ],
                    remediationNote: "Change the proposed institution name to remove restricted acronyms or statutory terms.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Proposed institution name contains no prohibited words or protected acronyms.",
                    details: `Screened name "${nameToTest}" against statutory AICTE restricted vocabulary. No prohibited terms found.`,
                    evidence: [
                        {
                            documentId: application.id,
                            documentType: "APPLICATION_METADATA",
                            fieldName: "institutionName",
                            rawText: nameToTest,
                            extractedValue: nameToTest,
                            pageNumber: null,
                            excerpt: `Proposed name: "${nameToTest}"`,
                        },
                    ],
                });
            }
        })();
        // --- RULE 2: Minimum Liquid Operational Funds (Clause 1.5.3, Table 1.2) ---
        (() => {
            const ruleId = "RULE_FUNDS_LIQUID_THRESHOLD";
            const ruleName = "Minimum Liquid Operational Funds";
            const aphClause = "Chapter I, Clause 1.5.3 & Table 1.2 (PDF pp. 5, 77-78)";
            if (!application.programCategory) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "INSUFFICIENT_INPUT",
                    severity: "HIGH",
                    summary: "Program category not specified in application metadata.",
                    details: "Statutory fund requirement depends on program category (₹100L for Engineering & Tech; ₹50L for other technical programs). Please specify programCategory.",
                    evidence: [],
                    remediationNote: "Provide programCategory in application details (e.g. 'ENGINEERING_AND_TECHNOLOGY' or 'OTHER').",
                });
                return;
            }
            const isEngineering = application.programCategory.toUpperCase().includes("ENGINEERING") ||
                application.programCategory.toUpperCase().includes("TECH");
            const requiredLakhs = isEngineering ? 100 : 50;
            const bankDoc = getFirstEnvelope("DOC_10_BANK_FUNDS");
            if (!bankDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Bank Certificate of Funds (DOC-10 / Certificate 3) was not submitted.",
                    details: `Mandatory Bank Certificate of Funds required to evidence minimum unencumbered liquid balance of ₹${requiredLakhs} Lakhs.`,
                    evidence: [],
                    remediationNote: "Upload Bank Certificate of Funds (Certificate 3) issued by a scheduled bank.",
                });
                return;
            }
            const funds = bankDoc.envelope.doc10BankFunds;
            if (!funds || !funds.amountInLakhsINR || funds.amountInLakhsINR.state !== "PRESENT") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EXTRACTION_UNCERTAIN",
                    severity: "HIGH",
                    summary: "Deposit/balance amount could not be clearly extracted from Bank Certificate.",
                    details: "Amount in Lakhs was illegible or ambiguous in the submitted bank certificate.",
                    evidence: [makeEvidence(bankDoc.docId, "DOC_10_BANK_FUNDS", "amountInLakhsINR", funds?.amountInLakhsINR)],
                    remediationNote: "Ensure the bank certificate clearly states the numeric balance/FDR amount.",
                });
                return;
            }
            const actualLakhs = funds.amountInLakhsINR.value ?? 0;
            const isUnencumbered = funds.isStatedUnencumbered?.value !== false;
            const evidenceList = [
                makeEvidence(bankDoc.docId, "DOC_10_BANK_FUNDS", "amountInLakhsINR", funds.amountInLakhsINR),
                makeEvidence(bankDoc.docId, "DOC_10_BANK_FUNDS", "isStatedUnencumbered", funds.isStatedUnencumbered),
                makeEvidence(bankDoc.docId, "DOC_10_BANK_FUNDS", "lienStatement", funds.lienStatement),
            ];
            if (actualLakhs < requiredLakhs) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: `Liquid funds shortfall: ₹${actualLakhs} Lakhs declared vs. ₹${requiredLakhs} Lakhs required.`,
                    details: `For ${application.programCategory}, AICTE requires minimum ₹${requiredLakhs} Lakhs unencumbered funds. Stated amount: ₹${actualLakhs} Lakhs.`,
                    evidence: evidenceList,
                    remediationNote: `Deposit additional funds to meet the minimum ₹${requiredLakhs} Lakhs threshold.`,
                });
            }
            else if (!isUnencumbered) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: "Operational bank funds are encumbered or have an active lien.",
                    details: `Funds meet ₹${requiredLakhs} Lakhs threshold but the document declares an encumbrance/lien: "${funds.lienStatement?.rawText || 'Lien active'}"`,
                    evidence: evidenceList,
                    remediationNote: "Submit an unencumbered bank certificate free of liens or credit attachments.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Liquid operational funds verified: ₹${actualLakhs} Lakhs unencumbered (threshold: ₹${requiredLakhs} Lakhs).`,
                    details: `Unencumbered liquid funds of ₹${actualLakhs} Lakhs meets the statutory ₹${requiredLakhs} Lakhs requirement.`,
                    evidence: evidenceList,
                });
            }
        })();
        // --- RULE 3: Registered Land Deed Tenure & Remaining Period (Clause 1.5.1a, 6.17a,b) ---
        (() => {
            const ruleId = "RULE_LAND_DEED_TENURE";
            const ruleName = "Land Ownership / Lease Tenure & Remaining Period";
            const aphClause = "Clause 1.5.1(a); Clause 6.17(a, b); Annexure 1.1 (PDF pp. 4, 56, 77)";
            const landDoc = getFirstEnvelope("DOC_03_LAND_DEED");
            if (!landDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Registered Land Deed or Lease Deed (DOC-03) was not submitted.",
                    details: "Mandatory land title or registered lease deed required for the proposed campus site.",
                    evidence: [],
                    remediationNote: "Upload the registered sale deed, gift deed, or registered lease deed.",
                });
                return;
            }
            const deed = landDoc.envelope.doc03LandDeed;
            const deedType = deed?.deedType?.value;
            if (!deed || !deedType) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EXTRACTION_UNCERTAIN",
                    severity: "HIGH",
                    summary: "Deed type could not be determined from the land document.",
                    details: "Could not classify whether document is a sale deed, gift deed, government lease, or private lease.",
                    evidence: [makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "deedType", deed?.deedType)],
                });
                return;
            }
            if (deedType === "SALE_DEED" || deedType === "GIFT_DEED" || deedType === "GOVERNMENT_LEASE") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Permanent ownership/government lease confirmed (${deedType}).`,
                    details: `The land is held under ${deedType}. Minimum 30-year lease restrictions do not apply to permanent ownership or government grants.`,
                    evidence: [
                        makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "deedType", deed.deedType),
                        makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "deedRegistrationNumber", deed.deedRegistrationNumber),
                    ],
                });
                return;
            }
            if (deedType === "PRIVATE_LEASE") {
                const tenureYears = deed.leaseTenureYears?.value;
                const expiryDateStr = deed.leaseExpiryDate?.value;
                const tenureEvidence = makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "leaseTenureYears", deed.leaseTenureYears);
                const expiryEvidence = makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "leaseExpiryDate", deed.leaseExpiryDate);
                if (tenureYears === null || tenureYears === undefined) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "EXTRACTION_UNCERTAIN",
                        severity: "HIGH",
                        summary: "Private lease tenure period (years) could not be extracted.",
                        details: "AICTE requires a registered lease tenure of at least 30 years, but tenure years was absent/ambiguous.",
                        evidence: [tenureEvidence, expiryEvidence],
                    });
                    return;
                }
                if (tenureYears < 30) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "FAIL_DEFICIENCY",
                        severity: "CRITICAL",
                        summary: `Lease tenure deficiency: ${tenureYears} years stated vs. 30 years required.`,
                        details: `Under AICTE Clause 1.5.1(a), private lease tenure must be at least 30 years. Extracted tenure: ${tenureYears} years.`,
                        evidence: [tenureEvidence, expiryEvidence],
                        remediationNote: "Execute and register a lease deed with minimum 30 years tenure.",
                    });
                    return;
                }
                // Check remaining live lease period (>= 5 years from evaluationDate)
                if (expiryDateStr) {
                    const expiryDate = new Date(expiryDateStr);
                    const diffMs = expiryDate.getTime() - evaluationDate.getTime();
                    const remainingYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
                    if (remainingYears < 5) {
                        findings.push({
                            ruleId,
                            ruleName,
                            aphClause,
                            outcome: "FAIL_DEFICIENCY",
                            severity: "CRITICAL",
                            summary: `Remaining lease period deficiency: ${remainingYears.toFixed(1)} years remaining vs. 5 years required.`,
                            details: `Lease expires on ${expiryDateStr}. Relative to evaluation date (${evalDateISO.substring(0, 10)}), remaining period is less than the mandatory 5 years.`,
                            evidence: [tenureEvidence, expiryEvidence],
                            remediationNote: "Extend the registered lease period to ensure at least 5 years remaining validity.",
                        });
                        return;
                    }
                }
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Private lease tenure compliant: ${tenureYears} years tenure with valid remaining term.`,
                    details: `Registered private lease satisfies the 30-year minimum tenure and 5-year remaining validity requirements.`,
                    evidence: [tenureEvidence, expiryEvidence],
                });
            }
        })();
        // --- RULE 4: Irrevocable Lease Joint Affidavit (Annexure 1.1) ---
        (() => {
            const ruleId = "RULE_LEASE_JOINT_AFFIDAVIT";
            const ruleName = "Irrevocable Lease Joint Affidavit (Affidavit 7)";
            const aphClause = "Annexure 1.1 (PDF p. 78)";
            const landDoc = getFirstEnvelope("DOC_03_LAND_DEED");
            const isPrivateLease = landDoc?.envelope.doc03LandDeed?.deedType?.value === "PRIVATE_LEASE";
            if (!isPrivateLease) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "NOT_APPLICABLE",
                    severity: "ADVISORY",
                    summary: "Affidavit 7 is not applicable (site is not held under a private lease).",
                    details: "Irrevocable Lease Joint Affidavit is conditional and only mandated for private lease arrangements.",
                    evidence: [],
                });
                return;
            }
            const leaseAffDoc = getFirstEnvelope("DOC_04_LEASE_AFFIDAVIT");
            if (!leaseAffDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: "Irrevocable Lease Joint Affidavit (DOC-04 / Affidavit 7) is missing for private lease.",
                    details: "When land is held on private lease, an irrevocable joint affidavit executed by lessor and lessee is mandatory.",
                    evidence: [],
                    remediationNote: "Submit registered Irrevocable Lease Joint Affidavit in AICTE Format 7.",
                });
                return;
            }
            const aff = leaseAffDoc.envelope.doc04LeaseAffidavit;
            if (aff?.hasIrrevocableCommitment?.value === false) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: "Joint lease affidavit does not contain explicit irrevocable commitment clause.",
                    details: "The submitted affidavit lacks the statutory undertaking confirming irrevocable lease for educational purposes.",
                    evidence: [makeEvidence(leaseAffDoc.docId, "DOC_04_LEASE_AFFIDAVIT", "hasIrrevocableCommitment", aff.hasIrrevocableCommitment)],
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Irrevocable Lease Joint Affidavit verified.",
                    details: "DOC-04 is present with explicit irrevocable lease commitments by both executing parties.",
                    evidence: [makeEvidence(leaseAffDoc.docId, "DOC_04_LEASE_AFFIDAVIT", "hasIrrevocableCommitment", aff?.hasIrrevocableCommitment)],
                });
            }
        })();
        // --- RULE 5: Land Use Certificate Permitted Purpose (Clause 6.17e) ---
        (() => {
            const ruleId = "RULE_LAND_USE_EDUCATIONAL";
            const ruleName = "Land Use Certificate Permitted Purpose";
            const aphClause = "Clause 6.17(e); Annexure 1.1 (PDF pp. 56, 78)";
            const lucDoc = getFirstEnvelope("DOC_05_LAND_USE");
            if (!lucDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Land Use Certificate / Conversion Order (DOC-05) was not submitted.",
                    details: "Competent authority order confirming land use permission for institutional/educational use is mandatory.",
                    evidence: [],
                    remediationNote: "Upload Land Use Certificate or conversion order from the competent revenue authority.",
                });
                return;
            }
            const luc = lucDoc.envelope.doc05LandUse;
            if (!luc || luc.isEducationalUseExplicitlyAllowed?.state !== "PRESENT") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Land use permitted classification requires manual officer review.",
                    details: `Stated permitted land use: "${luc?.permittedLandUse?.rawText || 'Unclear'}". Educational permission could not be deterministically confirmed.`,
                    evidence: [
                        makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "permittedLandUse", luc?.permittedLandUse),
                        makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "isEducationalUseExplicitlyAllowed", luc?.isEducationalUseExplicitlyAllowed),
                    ],
                });
                return;
            }
            if (luc.isEducationalUseExplicitlyAllowed.value === true) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Educational / institutional land use explicitly permitted.",
                    details: `Land Use Certificate issued by ${luc.issuingAuthority?.value || 'competent authority'} authorizes institutional/educational use.`,
                    evidence: [
                        makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "isEducationalUseExplicitlyAllowed", luc.isEducationalUseExplicitlyAllowed),
                        makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "orderReferenceNumber", luc.orderReferenceNumber),
                    ],
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: "Land conversion order restricts or does not permit educational use.",
                    details: `Stated land use: "${luc.permittedLandUse?.rawText}". Agricultural or commercial restrictions prevent institutional approval.`,
                    evidence: [makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "permittedLandUse", luc.permittedLandUse)],
                    remediationNote: "Obtain official conversion order for educational/institutional purpose.",
                });
            }
        })();
        // --- RULE 6: Land Parcels Arrangement (Clause 6.17d) ---
        (() => {
            const ruleId = "RULE_LAND_PARCELS_ARRANGEMENT";
            const ruleName = "Land Parcels Arrangement (Max 3 Plots)";
            const aphClause = "Clause 6.17(d); Annexure 3.1(g, h) (PDF pp. 56, 86)";
            const landDoc = getFirstEnvelope("DOC_03_LAND_DEED");
            const siteMapDoc = getFirstEnvelope("DOC_14_SITE_MAP");
            const plotNumbers = landDoc?.envelope.doc03LandDeed?.khasraSurveyPlotNumbers?.value ||
                siteMapDoc?.envelope.doc14SiteMap?.khasraSurveyNumbersShown?.value;
            if (!Array.isArray(plotNumbers) || plotNumbers.length === 0) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Survey / plot identifiers require manual verification.",
                    details: "Could not enumerate exact parcel count automatically from extracted land records.",
                    evidence: [],
                });
                return;
            }
            const parcelCount = plotNumbers.length;
            if (parcelCount > 3) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "HIGH",
                    summary: `Site comprises ${parcelCount} plots (maximum 3 plots permitted).`,
                    details: `AICTE Clause 6.17(d) permits a maximum of 3 land parcels. Identified plots: ${plotNumbers.join(", ")}`,
                    evidence: [
                        makeEvidence(landDoc?.docId || siteMapDoc?.docId || "", "DOC_03_LAND_DEED", "khasraSurveyPlotNumbers", landDoc?.envelope.doc03LandDeed?.khasraSurveyPlotNumbers),
                    ],
                    remediationNote: "Consolidate land parcels so campus does not exceed 3 separate plots.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Campus site comprises ${parcelCount} plot(s) (within $\\le 3$ limit).`,
                    details: `Parcels: ${plotNumbers.join(", ")}. Complies with parcel count limitation.`,
                    evidence: [
                        makeEvidence(landDoc?.docId || siteMapDoc?.docId || "", "DOC_03_LAND_DEED", "khasraSurveyPlotNumbers", landDoc?.envelope.doc03LandDeed?.khasraSurveyPlotNumbers),
                    ],
                });
            }
        })();
        // --- RULE 7: Building Occupancy / Completion Status (Clause 6.17g) ---
        (() => {
            const ruleId = "RULE_OCCUPANCY_STATUS";
            const ruleName = "Building Occupancy / Completion Evidence";
            const aphClause = "Clause 6.17(g); Annexure 1.1(iv) (PDF pp. 56, 77)";
            const occDoc = getFirstEnvelope("DOC_07_OCCUPANCY");
            if (!occDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Building Occupancy / Completion Certificate (DOC-07) was not submitted.",
                    details: "Mandatory Occupancy/Completion certificate or Form D required to evidence building readiness.",
                    evidence: [],
                    remediationNote: "Upload Occupancy Certificate or Building Completion Certificate.",
                });
                return;
            }
            const occ = occDoc.envelope.doc07Occupancy;
            const status = occ?.occupancyStatus?.value;
            const expiryStr = occ?.expiryDate?.value;
            const occEvidence = makeEvidence(occDoc.docId, "DOC_07_OCCUPANCY", "occupancyStatus", occ?.occupancyStatus);
            if (expiryStr) {
                const expiryDate = new Date(expiryStr);
                if (expiryDate.getTime() < evaluationDate.getTime()) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "EXPIRED",
                        severity: "CRITICAL",
                        summary: `Occupancy permission expired on ${expiryStr}.`,
                        details: `Building certificate expired relative to evaluation date (${evalDateISO.substring(0, 10)}).`,
                        evidence: [occEvidence, makeEvidence(occDoc.docId, "DOC_07_OCCUPANCY", "expiryDate", occ?.expiryDate)],
                        remediationNote: "Submit a renewed/permanent Occupancy Certificate.",
                    });
                    return;
                }
            }
            if (status === "PERMANENT") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Permanent Occupancy / Completion Certificate confirmed.",
                    details: "Building is certified with permanent occupancy status by the competent local authority.",
                    evidence: [occEvidence],
                });
            }
            else if (status === "PROVISIONAL" || status === "PARTIAL") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "HIGH",
                    summary: `${status} Occupancy Certificate submitted; requires scrutiny committee review.`,
                    details: `AICTE APH highlights that provisional or partial occupancy is conditional and subject to scrutiny verification of completed areas.`,
                    evidence: [occEvidence],
                    remediationNote: "Officer must verify whether completed floors cover required initial intake instructional areas.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Occupancy status unclear from certificate text.",
                    details: `Extracted status: "${occ?.occupancyStatus?.rawText || 'Unknown'}". Manual officer inspection required.`,
                    evidence: [occEvidence],
                });
            }
        })();
        // --- RULE 8: Structural Stability Certificate (Clause 6.17h) ---
        (() => {
            const ruleId = "RULE_STRUCTURAL_STABILITY";
            const ruleName = "Structural Stability (Buildings > 30 Years Old)";
            const aphClause = "Clause 6.17(h); Annexure 3.1(e) (PDF pp. 56, 86)";
            const stabDoc = getFirstEnvelope("DOC_08_STRUCTURAL_STABILITY");
            const stab = stabDoc?.envelope.doc08StructuralStability;
            const buildingAge = stab?.buildingAgeYears?.value;
            if (buildingAge !== null && buildingAge !== undefined && buildingAge <= 30) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "NOT_APPLICABLE",
                    severity: "ADVISORY",
                    summary: `Structural stability certificate not required (building age is ${buildingAge} years, $\\le 30$ years).`,
                    details: "APH Clause 6.17(h) mandates structural stability certification specifically for structures exceeding 30 years.",
                    evidence: [makeEvidence(stabDoc?.docId || "", "DOC_08_STRUCTURAL_STABILITY", "buildingAgeYears", stab?.buildingAgeYears)],
                });
                return;
            }
            if (!stabDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Structural stability certificate absent; building age requires confirmation.",
                    details: "If the proposed building is newly constructed ($\le 30$ years), this check passes. If $> 30$ years, certificate is mandatory.",
                    evidence: [],
                    remediationNote: "Officer should check building completion date on occupancy certificate.",
                });
                return;
            }
            // If document is submitted, check validity
            const expiryStr = stab?.expiryDate?.value;
            if (expiryStr) {
                const expDate = new Date(expiryStr);
                if (expDate.getTime() < evaluationDate.getTime()) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "EXPIRED",
                        severity: "HIGH",
                        summary: `Structural Stability Certificate expired on ${expiryStr}.`,
                        details: "Structural stability certificates carry maximum 5-year validity. The submitted certificate is past its expiry date.",
                        evidence: [makeEvidence(stabDoc.docId, "DOC_08_STRUCTURAL_STABILITY", "expiryDate", stab.expiryDate)],
                        remediationNote: "Submit an updated structural stability certificate by a certified structural engineer.",
                    });
                    return;
                }
            }
            findings.push({
                ruleId,
                ruleName,
                aphClause,
                outcome: "PASS",
                severity: "ADVISORY",
                summary: "Valid Structural Stability Certificate verified.",
                details: `Issued by ${stab?.issuingEngineerName?.value || 'certified structural engineer'} (${stab?.engineerQualification?.value || 'qualified'}). Conclusion: ${stab?.structuralFitnessConclusion?.value || 'Fit for institutional occupancy'}.`,
                evidence: [
                    makeEvidence(stabDoc.docId, "DOC_08_STRUCTURAL_STABILITY", "issuingEngineerName", stab?.issuingEngineerName),
                    makeEvidence(stabDoc.docId, "DOC_08_STRUCTURAL_STABILITY", "structuralFitnessConclusion", stab?.structuralFitnessConclusion),
                ],
            });
        })();
        // --- RULE 9: Fire Safety Certificate Validity (Clause 6.17i) ---
        (() => {
            const ruleId = "RULE_FIRE_SAFETY_VALIDITY";
            const ruleName = "Fire Safety Certificate Validity";
            const aphClause = "Clause 6.17(i); Annexure 1.1(v) (PDF pp. 56, 77)";
            const fireDoc = getFirstEnvelope("DOC_09_FIRE_SAFETY");
            if (!fireDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Fire Safety Certificate (DOC-09) was not submitted.",
                    details: "Mandatory NOC / Certificate from the competent Fire Authority required for the institution site.",
                    evidence: [],
                    remediationNote: "Upload valid Fire Safety Certificate from competent State Fire Services.",
                });
                return;
            }
            const fire = fireDoc.envelope.doc09FireSafety;
            const expiryStr = fire?.expiryDate?.value;
            const issueStr = fire?.issueDate?.value;
            const dateEvidence = [
                makeEvidence(fireDoc.docId, "DOC_09_FIRE_SAFETY", "issueDate", fire?.issueDate),
                makeEvidence(fireDoc.docId, "DOC_09_FIRE_SAFETY", "expiryDate", fire?.expiryDate),
            ];
            if (!expiryStr && !issueStr) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EXTRACTION_UNCERTAIN",
                    severity: "HIGH",
                    summary: "Validity dates could not be extracted from Fire Safety Certificate.",
                    details: "Both issue date and expiry date were unextracted or ambiguous in the fire safety certificate.",
                    evidence: dateEvidence,
                });
                return;
            }
            if (expiryStr) {
                const expDate = new Date(expiryStr);
                if (expDate.getTime() < evaluationDate.getTime()) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "EXPIRED",
                        severity: "CRITICAL",
                        summary: `Fire Safety Certificate expired on ${expiryStr}.`,
                        details: `Certificate expired prior to evaluation date (${evalDateISO.substring(0, 10)}). An active fire certificate is a mandatory prerequisite.`,
                        evidence: dateEvidence,
                        remediationNote: "Obtain and upload renewed Fire Safety Certificate.",
                    });
                    return;
                }
            }
            findings.push({
                ruleId,
                ruleName,
                aphClause,
                outcome: "PASS",
                severity: "ADVISORY",
                summary: `Fire Safety Certificate is valid and active${expiryStr ? ` (expires ${expiryStr})` : ''}.`,
                details: `Issued by ${fire?.issuingAuthority?.value || 'Fire Authority'}. Covers campus buildings.`,
                evidence: dateEvidence,
            });
        })();
        // --- RULE 10: Infrastructure Administrative & Amenities Areas (Clause 1.5.1c, 6.17-6.18) ---
        (() => {
            const ruleId = "RULE_INFRASTRUCTURE_ADMIN_AMENITIES";
            const ruleName = "Minimum Administrative & Amenities Built-Up Areas";
            const aphClause = "Clause 1.5.1(c); Clause 6.17–6.18; Annexure 3.2, 3.3, 3.4 (PDF pp. 4, 56–57, 87–91)";
            if (!application.programCategory || !application.proposedIntake) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "INSUFFICIENT_INPUT",
                    severity: "HIGH",
                    summary: "Program category or proposed intake not specified in application metadata.",
                    details: "Carpet area standards depend directly on program category and sanctioned intake. Please specify both in application metadata.",
                    evidence: [],
                    remediationNote: "Provide proposedIntake (e.g. 300) and programCategory in application details.",
                });
                return;
            }
            const planDoc = getFirstEnvelope("DOC_06_BUILDING_PLAN");
            if (!planDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Approved Building Plan & Room Schedule (DOC-06) was not submitted.",
                    details: "Approved building plan and carpet area schedule required to verify infrastructure compliance.",
                    evidence: [],
                    remediationNote: "Upload Approved Building Plan with Council of Architecture certification.",
                });
                return;
            }
            const plan = planDoc.envelope.doc06BuildingPlan;
            const carpetSummary = plan?.carpetAreaSummary?.value;
            if (!carpetSummary) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EXTRACTION_UNCERTAIN",
                    severity: "HIGH",
                    summary: "Carpet area breakdown schedule could not be extracted from building plan.",
                    details: "Could not locate the instructional, administrative, and amenities area schedule.",
                    evidence: [makeEvidence(planDoc.docId, "DOC_06_BUILDING_PLAN", "carpetAreaSummary", plan?.carpetAreaSummary)],
                });
                return;
            }
            const adminSqM = carpetSummary.administrativeSqM;
            const amenitiesSqM = carpetSummary.amenitiesSqM;
            const isEngg = application.programCategory.toUpperCase().includes("ENGINEERING") ||
                application.programCategory.toUpperCase().includes("TECH");
            // For Engineering with intake <= 300: admin >= 750 m², amenities >= 500 m²
            if (isEngg && application.proposedIntake <= 300) {
                const minAdmin = 750;
                const minAmenities = 500;
                const summaryEvidence = makeEvidence(planDoc.docId, "DOC_06_BUILDING_PLAN", "carpetAreaSummary", plan.carpetAreaSummary);
                if (adminSqM !== null && adminSqM < minAdmin) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "FAIL_DEFICIENCY",
                        severity: "HIGH",
                        summary: `Administrative area shortfall: ${adminSqM} m² declared vs ${minAdmin} m² required.`,
                        details: `APH Annexure 3.3 prescribes minimum ${minAdmin} m² administrative area for intake up to 300.`,
                        evidence: [summaryEvidence],
                        remediationNote: `Increase allocated administrative carpet area to at least ${minAdmin} m².`,
                    });
                    return;
                }
                if (amenitiesSqM !== null && amenitiesSqM < minAmenities) {
                    findings.push({
                        ruleId,
                        ruleName,
                        aphClause,
                        outcome: "FAIL_DEFICIENCY",
                        severity: "HIGH",
                        summary: `Amenities area shortfall: ${amenitiesSqM} m² declared vs ${minAmenities} m² required.`,
                        details: `APH Annexure 3.4 prescribes minimum ${minAmenities} m² amenities area for intake up to 300.`,
                        evidence: [summaryEvidence],
                        remediationNote: `Increase allocated amenities carpet area to at least ${minAmenities} m².`,
                    });
                    return;
                }
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Administrative (${adminSqM ?? 'N/A'} m²) and amenities (${amenitiesSqM ?? 'N/A'} m²) areas satisfy statutory minima.`,
                    details: `Meets AICTE standards for intake ${application.proposedIntake} in ${application.programCategory}.`,
                    evidence: [summaryEvidence],
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: `Specialized area thresholds for intake ${application.proposedIntake} require manual table scrutiny.`,
                    details: `Administrative area: ${adminSqM ?? 'N/A'} m², Amenities: ${amenitiesSqM ?? 'N/A'} m². Officer must check against programme-specific Table 3.2.`,
                    evidence: [makeEvidence(planDoc.docId, "DOC_06_BUILDING_PLAN", "carpetAreaSummary", plan.carpetAreaSummary)],
                });
            }
        })();
        // --- RULE 11: Applicant Resolution & Commitment (Format 3) ---
        (() => {
            const ruleId = "RULE_APPLICANT_RESOLUTION_COMMITMENT";
            const ruleName = "Applicant Organisation Resolution (Format 3)";
            const aphClause = "Annexure 1.1(iii) (PDF p. 77)";
            const resDoc = getFirstEnvelope("DOC_02_RESOLUTION");
            if (!resDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Applicant Organisation Resolution (DOC-02 / Format 3) was not submitted.",
                    details: "Governing body resolution resolving to establish the institution and committing resources is mandatory.",
                    evidence: [],
                    remediationNote: "Upload applicant organisation resolution in AICTE Format 3.",
                });
                return;
            }
            const res = resDoc.envelope.doc02Resolution;
            const hasDecision = res?.hasEstablishmentDecision?.value;
            const hasCommitment = res?.hasResourceCommitment?.value;
            const ev = [
                makeEvidence(resDoc.docId, "DOC_02_RESOLUTION", "hasEstablishmentDecision", res?.hasEstablishmentDecision),
                makeEvidence(resDoc.docId, "DOC_02_RESOLUTION", "hasResourceCommitment", res?.hasResourceCommitment),
            ];
            if (hasDecision === true && hasCommitment === true) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Resolution records explicit decision to establish institution and commitment of resources.",
                    details: "DOC-02 complies with AICTE Format 3 governance requirements.",
                    evidence: ev,
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "HIGH",
                    summary: "Resolution missing statutory commitment to establish institution or allocate required funds/land.",
                    details: `Establishment decision stated: ${hasDecision}; Resource commitment stated: ${hasCommitment}.`,
                    evidence: ev,
                    remediationNote: "Adopt a formal resolution incorporating full AICTE Format 3 commitment clauses.",
                });
            }
        })();
        // --- RULE 12: Non-Profit Legal Constitution (Clause 1.3.4) ---
        (() => {
            const ruleId = "RULE_NON_PROFIT_GOVERNANCE";
            const ruleName = "Non-Profit Constitution of Sponsoring Body";
            const aphClause = "Clause 1.3.4; Annexure 1.1(viii, x) (PDF pp. 2, 77)";
            const regDoc = getFirstEnvelope("DOC_01_REGISTRATION");
            if (!regDoc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Applicant Registration Document & MoA (DOC-01) was not submitted.",
                    details: "Registration deed/certificate and MoA/Rules required to prove applicant body's legal identity and constitution.",
                    evidence: [],
                    remediationNote: "Upload Trust Deed, Society Registration Certificate, or Section 8 Company Certificate with MoA.",
                });
                return;
            }
            const reg = regDoc.envelope.doc01Registration;
            const entityType = reg?.entityType?.value;
            const hasNonProfit = reg?.hasNonProfitClause?.value;
            const ev = [
                makeEvidence(regDoc.docId, "DOC_01_REGISTRATION", "entityType", reg?.entityType),
                makeEvidence(regDoc.docId, "DOC_01_REGISTRATION", "hasNonProfitClause", reg?.hasNonProfitClause),
            ];
            if (entityType === "OTHER") {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "CRITICAL",
                    summary: `Ineligible entity type: "${reg?.entityType?.rawText}". Must be Society, Trust, or Section 8 Company.`,
                    details: "AICTE Act requires technical institutions to be founded by a non-profit Trust, registered Society, or Section 8 Company.",
                    evidence: ev,
                    remediationNote: "Applicant must be an eligible Society, Public Trust, or Section 8 non-profit company.",
                });
                return;
            }
            if (hasNonProfit === false) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "FAIL_DEFICIENCY",
                    severity: "HIGH",
                    summary: "Governing document lacks explicit non-profit clause or permitted educational activity clause.",
                    details: "The MoA/Trust deed does not contain statutory non-profit clauses.",
                    evidence: ev,
                    remediationNote: "Submit registered amendment or byelaws confirming non-profit status.",
                });
                return;
            }
            findings.push({
                ruleId,
                ruleName,
                aphClause,
                outcome: "PASS",
                severity: "ADVISORY",
                summary: `Eligible non-profit governance verified (${entityType}).`,
                details: `Sponsoring body is a registered ${entityType} with non-profit educational objectives.`,
                evidence: ev,
            });
        })();
        // --- RULE 13: General AICTE Undertaking (Clause 1.4.4) ---
        (() => {
            const ruleId = "RULE_GENERAL_AICTE_UNDERTAKING";
            const ruleName = "General AICTE Undertaking (Affidavit 2)";
            const aphClause = "Clause 1.4.4; Annexure 1.1 (PDF p. 4)";
            const aff2Doc = getFirstEnvelope("DOC_11_AFFIDAVIT_2");
            if (!aff2Doc) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "CRITICAL",
                    summary: "Affidavit 2 (General AICTE Undertaking) was not submitted.",
                    details: "Statutory Affidavit 2 on e-stamp paper undertaking adherence to AICTE regulations is mandatory.",
                    evidence: [],
                    remediationNote: "Upload executed Affidavit 2 in the prescribed AICTE format.",
                });
                return;
            }
            const aff = aff2Doc.envelope.doc11Affidavit2;
            const deponent = aff?.deponentName?.value;
            const date = aff?.executionDate?.value;
            if (!deponent || !date) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EXTRACTION_UNCERTAIN",
                    severity: "MEDIUM",
                    summary: "Deponent name or execution date could not be verified on Affidavit 2.",
                    details: "Affidavit 2 is present, but authorized deponent credentials or notarization date are ambiguous.",
                    evidence: [
                        makeEvidence(aff2Doc.docId, "DOC_11_AFFIDAVIT_2", "deponentName", aff?.deponentName),
                        makeEvidence(aff2Doc.docId, "DOC_11_AFFIDAVIT_2", "executionDate", aff?.executionDate),
                    ],
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: `Affidavit 2 verified (executed by ${deponent} on ${date}).`,
                    details: "General statutory undertaking is on record.",
                    evidence: [
                        makeEvidence(aff2Doc.docId, "DOC_11_AFFIDAVIT_2", "deponentName", aff?.deponentName),
                        makeEvidence(aff2Doc.docId, "DOC_11_AFFIDAVIT_2", "executionDate", aff?.executionDate),
                    ],
                });
            }
        })();
        // --- RULE 14: Cross-Document Sponsoring Body Name Alignment (Section 6) ---
        (() => {
            const ruleId = "RULE_CROSS_SPONSORING_BODY_NAME";
            const ruleName = "Sponsoring Body Name Consistency Across Documents";
            const aphClause = "Section 6 (Cross-Document Consistency, PDF p. 6)";
            // Names across documents
            const regDoc = getFirstEnvelope("DOC_01_REGISTRATION");
            const resDoc = getFirstEnvelope("DOC_02_RESOLUTION");
            const landDoc = getFirstEnvelope("DOC_03_LAND_DEED");
            const bankDoc = getFirstEnvelope("DOC_10_BANK_FUNDS");
            const aff2Doc = getFirstEnvelope("DOC_11_AFFIDAVIT_2");
            const baseNameField = regDoc?.envelope.doc01Registration?.applicantLegalName;
            const baseName = baseNameField?.value;
            if (!baseName) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "HIGH",
                    summary: "Primary registered applicant name missing from DOC-01.",
                    details: "Cannot run cross-document entity alignment without registered applicant name from DOC-01.",
                    evidence: [],
                });
                return;
            }
            // Legal name normalization function:
            // Normalizes whitespace, lowercase, and punctuation WITHOUT removing legal words (Society, Trust, Foundation)
            const normalizeLegalName = (str) => {
                return str
                    .toLowerCase()
                    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            };
            const baseNorm = normalizeLegalName(baseName);
            const comparisonList = [
                { docType: "DOC_02_RESOLUTION", docId: resDoc?.docId || "", fieldName: "sponsoringBodyName", fieldObj: resDoc?.envelope.doc02Resolution?.sponsoringBodyName },
                { docType: "DOC_03_LAND_DEED", docId: landDoc?.docId || "", fieldName: "transfereeLesseeName", fieldObj: landDoc?.envelope.doc03LandDeed?.transfereeLesseeName },
                { docType: "DOC_10_BANK_FUNDS", docId: bankDoc?.docId || "", fieldName: "accountHolderName", fieldObj: bankDoc?.envelope.doc10BankFunds?.accountHolderName },
                { docType: "DOC_11_AFFIDAVIT_2", docId: aff2Doc?.docId || "", fieldName: "sponsoringBodyName", fieldObj: aff2Doc?.envelope.doc11Affidavit2?.sponsoringBodyName },
            ];
            const evidenceArr = [
                makeEvidence(regDoc?.docId || "", "DOC_01_REGISTRATION", "applicantLegalName", baseNameField),
            ];
            const discrepancies = [];
            const reviewNeeded = [];
            for (const item of comparisonList) {
                if (!item.fieldObj || !item.fieldObj.value)
                    continue;
                evidenceArr.push(makeEvidence(item.docId, item.docType, item.fieldName, item.fieldObj));
                const itemNorm = normalizeLegalName(String(item.fieldObj.value));
                if (itemNorm === baseNorm) {
                    continue;
                }
                // Check if individual trustee name vs trust name (e.g. "Mr.", "Dr.", "Chairman")
                const isIndividualTitle = /\b(mr|mrs|shri|smt|dr|prof)\b/i.test(itemNorm);
                const baseHasTrustOrSociety = /\b(trust|society|foundation|samiti|mandal|company)\b/i.test(baseNorm);
                const itemHasTrustOrSociety = /\b(trust|society|foundation|samiti|mandal|company)\b/i.test(itemNorm);
                if (baseHasTrustOrSociety && !itemHasTrustOrSociety && isIndividualTitle) {
                    discrepancies.push(`In ${item.docType}, ${item.fieldName} is issued to an individual ("${item.fieldObj.value}") instead of the legal sponsoring body ("${baseName}").`);
                }
                else if (Math.abs(itemNorm.length - baseNorm.length) > 10 || !itemNorm.includes(baseNorm.split(" ")[0] || "---")) {
                    discrepancies.push(`Significant name mismatch in ${item.docType}: "${item.fieldObj.value}" vs "${baseName}".`);
                }
                else {
                    reviewNeeded.push(`Minor wording variation in ${item.docType}: "${item.fieldObj.value}" vs "${baseName}".`);
                }
            }
            if (discrepancies.length > 0) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MISMATCH_DETECTED",
                    severity: "CRITICAL",
                    summary: `Sponsoring body identity mismatch detected across submitted documents.`,
                    details: discrepancies.join(" "),
                    evidence: evidenceArr,
                    remediationNote: "Ensure all institutional accounts, land deeds, and resolutions are legally held in the exact registered name of the sponsoring body.",
                });
            }
            else if (reviewNeeded.length > 0) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Minor naming variations observed across documents; requires officer review.",
                    details: reviewNeeded.join(" "),
                    evidence: evidenceArr,
                    remediationNote: "Scrutiny officer should verify whether variations represent the same registered entity.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "Sponsoring body name is strictly consistent across all submitted documents.",
                    details: `All documents consistently reference "${baseName}".`,
                    evidence: evidenceArr,
                });
            }
        })();
        // --- RULE 15: Cross-Document Campus Site Location Consistency (Section 6) ---
        (() => {
            const ruleId = "RULE_CROSS_CAMPUS_ADDRESS";
            const ruleName = "Campus Site Location & Address Alignment";
            const aphClause = "Section 6 (Cross-Document Consistency, PDF p. 6)";
            const landDoc = getFirstEnvelope("DOC_03_LAND_DEED");
            const lucDoc = getFirstEnvelope("DOC_05_LAND_USE");
            const occDoc = getFirstEnvelope("DOC_07_OCCUPANCY");
            const fireDoc = getFirstEnvelope("DOC_09_FIRE_SAFETY");
            const ev = [];
            const addresses = [];
            if (landDoc?.envelope.doc03LandDeed?.landRevenueLocation?.value) {
                ev.push(makeEvidence(landDoc.docId, "DOC_03_LAND_DEED", "landRevenueLocation", landDoc.envelope.doc03LandDeed.landRevenueLocation));
                addresses.push({ docType: "DOC-03", val: landDoc.envelope.doc03LandDeed.landRevenueLocation.value });
            }
            if (Array.isArray(lucDoc?.envelope.doc05LandUse?.khasraSurveyPlotNumbers?.value)) {
                ev.push(makeEvidence(lucDoc.docId, "DOC_05_LAND_USE", "khasraSurveyPlotNumbers", lucDoc.envelope.doc05LandUse.khasraSurveyPlotNumbers));
                addresses.push({ docType: "DOC-05", val: lucDoc.envelope.doc05LandUse.khasraSurveyPlotNumbers.value.join(", ") });
            }
            if (occDoc?.envelope.doc07Occupancy?.campusPhysicalSiteAddress?.value) {
                ev.push(makeEvidence(occDoc.docId, "DOC_07_OCCUPANCY", "campusPhysicalSiteAddress", occDoc.envelope.doc07Occupancy.campusPhysicalSiteAddress));
                addresses.push({ docType: "DOC-07", val: occDoc.envelope.doc07Occupancy.campusPhysicalSiteAddress.value });
            }
            if (fireDoc?.envelope.doc09FireSafety?.campusPhysicalSiteAddress?.value) {
                ev.push(makeEvidence(fireDoc.docId, "DOC_09_FIRE_SAFETY", "campusPhysicalSiteAddress", fireDoc.envelope.doc09FireSafety.campusPhysicalSiteAddress));
                addresses.push({ docType: "DOC-09", val: fireDoc.envelope.doc09FireSafety.campusPhysicalSiteAddress.value });
            }
            if (addresses.length < 2) {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "EVIDENCE_MISSING",
                    severity: "MEDIUM",
                    summary: "Insufficient address evidence extracted to verify cross-document site alignment.",
                    details: "Requires at least two documents containing location or survey details to compare.",
                    evidence: ev,
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "MEDIUM",
                    summary: "Site address descriptions across revenue, building, and fire records require visual officer alignment.",
                    details: `Addresses recorded across documents: ${addresses.map((a) => `${a.docType}: "${a.val}"`).join("; ")}`,
                    evidence: ev,
                    remediationNote: "Verify that municipal/postal address matches the revenue land parcel survey location.",
                });
            }
        })();
        // --- RULE 16: Payload Hash Collision / Duplicate File Slots (Section 6) ---
        await (async () => {
            const ruleId = "RULE_INTEGRITY_DUPLICATE_FILES";
            const ruleName = "Payload Hash Collision & Duplicate Document Slots";
            const aphClause = "Section 6 (Cross-Document Consistency & Integrity, PDF p. 6)";
            const hashMap = new Map(); // hash -> doc originalNames
            const fileEv = [];
            for (const d of docs) {
                try {
                    let hash = d.fileHash;
                    if (!hash) {
                        const buffer = await fs.readFile(d.filePath);
                        hash = crypto.createHash("sha256").update(buffer).digest("hex");
                        await prisma.document.update({
                            where: { id: d.id },
                            data: { fileHash: hash },
                        });
                    }
                    const existing = hashMap.get(hash) || [];
                    existing.push(`${d.originalName} (${d.documentType})`);
                    hashMap.set(hash, existing);
                    fileEv.push({
                        documentId: d.id,
                        documentType: d.documentType,
                        fieldName: "fileHash",
                        rawText: hash,
                        extractedValue: hash,
                        pageNumber: null,
                        excerpt: `File: ${d.originalName}`,
                    });
                }
                catch (readErr) {
                    console.error(`Could not hash file ${d.filePath}:`, readErr);
                }
            }
            const duplicates = Array.from(hashMap.entries()).filter(([_, names]) => names.length > 1);
            if (duplicates.length > 0) {
                const details = duplicates
                    .map(([hash, names]) => `Identical binary file uploaded for: ${names.join(" AND ")} (SHA-256: ${hash.substring(0, 12)}...)`)
                    .join("; ");
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "MANUAL_REVIEW_REQUIRED",
                    severity: "HIGH",
                    summary: "Identical file uploaded across multiple distinct document slots.",
                    details,
                    evidence: fileEv,
                    remediationNote: "Flagged for scrutiny: verify if applicant uploaded placeholder or wrong document in one of the slots.",
                });
            }
            else {
                findings.push({
                    ruleId,
                    ruleName,
                    aphClause,
                    outcome: "PASS",
                    severity: "ADVISORY",
                    summary: "All uploaded document files possess distinct binary hashes.",
                    details: "No duplicate document payload collisions detected.",
                    evidence: fileEv,
                });
            }
        })();
        // --- Calculate Summary Counts and Overall Status ---
        let passedCount = 0;
        let deficiencyCount = 0;
        let reviewCount = 0;
        let missingCount = 0;
        for (const f of findings) {
            if (f.outcome === "PASS" || f.outcome === "NOT_APPLICABLE") {
                passedCount++;
            }
            else if (f.outcome === "FAIL_DEFICIENCY" || f.outcome === "EXPIRED" || f.outcome === "MISMATCH_DETECTED") {
                deficiencyCount++;
            }
            else if (f.outcome === "EVIDENCE_MISSING") {
                missingCount++;
            }
            else if (f.outcome === "MANUAL_REVIEW_REQUIRED" || f.outcome === "EXTRACTION_UNCERTAIN") {
                reviewCount++;
            }
            else if (f.outcome === "INSUFFICIENT_INPUT") {
                reviewCount++;
            }
        }
        let overallStatus = "COMPLIANT";
        if (deficiencyCount > 0) {
            overallStatus = "DEFICIENCIES_DETECTED";
        }
        else if (missingCount > 0 || reviewCount > 0) {
            overallStatus = "MANUAL_REVIEW_REQUIRED";
        }
        const evaluationResult = {
            evaluationDate: evalDateISO,
            overallStatus,
            totalRulesRun: findings.length,
            passedCount,
            deficiencyCount,
            reviewCount,
            missingCount,
            findings,
        };
        // Save ScrutinyReport in database
        await prisma.scrutinyReport.create({
            data: {
                applicationId,
                evaluationDate,
                overallStatus,
                totalRulesRun: findings.length,
                passedCount,
                deficiencyCount,
                reviewCount,
                missingCount,
                findings: findings,
            },
        });
        // Update Application status
        await prisma.application.update({
            where: { id: applicationId },
            data: {
                status: overallStatus,
            },
        });
        return evaluationResult;
    }
}
export const complianceService = new ComplianceService();
//# sourceMappingURL=compliance.service.js.map