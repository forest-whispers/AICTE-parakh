import { MOCK_BANK_CONFIRMATIONS, } from "../../fixtures/mock-authority-registry.fixture.js";
function normalizeString(val) {
    if (val === null || val === undefined)
        return "";
    return String(val).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function extractFieldValue(fieldObj) {
    if (fieldObj === null || fieldObj === undefined)
        return null;
    if (typeof fieldObj === "object" && "value" in fieldObj) {
        return fieldObj.value;
    }
    return fieldObj;
}
export function verifyBankConfirmation(document, officerConfirmation) {
    const docData = document?.extractedData?.doc10BankFunds || document?.extractedData || {};
    const fdrNumber = extractFieldValue(docData.accountOrFdrNumber) || extractFieldValue(docData.fdrNumber);
    const bankName = extractFieldValue(docData.bankName);
    const branchName = extractFieldValue(docData.branchName);
    const accountHolder = extractFieldValue(docData.accountHolderName);
    const amountLakhs = extractFieldValue(docData.amountInLakhsINR);
    const isUnencumbered = extractFieldValue(docData.isUnencumbered);
    const lienStatement = extractFieldValue(docData.lienStatement);
    const submittedFields = {
        accountOrFdrNumber: fdrNumber,
        bankName,
        branchName,
        accountHolderName: accountHolder,
        amountInLakhsINR: amountLakhs,
        isUnencumbered,
        lienStatement,
    };
    const authorityName = "Scheduled Bank / Branch Management";
    // Case 1: An official manual bank confirmation letter was recorded by a scrutiny officer
    if (officerConfirmation) {
        const authoritativeFields = {
            letterReference: officerConfirmation.letterReference,
            letterDate: officerConfirmation.letterDate,
            recordingOfficer: officerConfirmation.recordingOfficer,
            branchManagerName: officerConfirmation.branchManagerName || "Branch Manager",
            confirmedAmountLakhs: officerConfirmation.confirmedAmountLakhs,
            isUnencumbered: officerConfirmation.isUnencumbered,
            remarks: officerConfirmation.remarks || "Physical confirmation letter verified on record",
        };
        const discrepancies = [];
        if (!officerConfirmation.isUnencumbered) {
            discrepancies.push({
                field: "isUnencumbered",
                label: "Encumbrance Status",
                submitted: "Unencumbered",
                authoritative: "Encumbered",
                observation: "Officer recorded that bank confirmation letter discloses an active encumbrance.",
            });
        }
        if (discrepancies.length > 0) {
            return {
                authorityCategory: "BANK_BRANCH",
                authorityName,
                verificationMode: "MANUAL_CONFIRMATION_ROUTED",
                sourceName: `Officer-Recorded Bank Confirmation (by ${officerConfirmation.recordingOfficer})`,
                queryReference: fdrNumber ? String(fdrNumber).trim() : null,
                documentId: document?.id || null,
                status: "MISMATCH_DETECTED",
                submittedFields,
                authoritativeFields,
                discrepancies,
                summary: `Officer recorded bank confirmation ref ${officerConfirmation.letterReference}, but encumbrance was noted.`,
                scrutinyActionPrompt: "Scrutiny committee must require an unencumbered term deposit pursuant to APH Chapter I.",
            };
        }
        return {
            authorityCategory: "BANK_BRANCH",
            authorityName,
            verificationMode: "MANUAL_CONFIRMATION_ROUTED",
            sourceName: `Officer-Recorded Bank Confirmation (by ${officerConfirmation.recordingOfficer})`,
            queryReference: fdrNumber ? String(fdrNumber).trim() : null,
            documentId: document?.id || null,
            status: "CONFIRMATION_RECORDED",
            submittedFields,
            authoritativeFields,
            discrepancies: [],
            summary: `Official bank confirmation letter verified and recorded on file (Ref: ${officerConfirmation.letterReference}, Date: ${officerConfirmation.letterDate}). Bank confirms ₹${officerConfirmation.confirmedAmountLakhs} Lakhs unencumbered.`,
            scrutinyActionPrompt: "Bank funds officially confirmed by branch manager. Fund requirement met.",
        };
    }
    // Case 2: Automated / Simulated verification
    if (!fdrNumber || String(fdrNumber).trim().length === 0) {
        return {
            authorityCategory: "BANK_BRANCH",
            authorityName,
            verificationMode: "SIMULATED_BRANCH_INQUIRY",
            sourceName: "Simulated Bank Branch Confirmation Response",
            queryReference: null,
            documentId: document?.id || null,
            status: "FORMAT_INVALID",
            submittedFields,
            authoritativeFields: null,
            discrepancies: [
                {
                    field: "accountOrFdrNumber",
                    label: "FDR / Account Reference",
                    submitted: null,
                    authoritative: null,
                    observation: "FDR or account number could not be extracted from the submitted bank certificate.",
                },
            ],
            summary: "Bank certificate reference number missing or illegible in submitted document.",
            scrutinyActionPrompt: "Request clear bank deposit receipt with legible FDR/account number.",
        };
    }
    const queryRef = String(fdrNumber).trim();
    const found = MOCK_BANK_CONFIRMATIONS.find((item) => normalizeString(item.fdrOrAccountNumber) === normalizeString(queryRef));
    if (!found) {
        // Bank confirmation has not been received; strictly mark CONFIRMATION_PENDING
        return {
            authorityCategory: "BANK_BRANCH",
            authorityName,
            verificationMode: "MANUAL_CONFIRMATION_ROUTED",
            sourceName: "Branch Confirmation Inquiry Tracker",
            queryReference: queryRef,
            documentId: document?.id || null,
            status: "CONFIRMATION_PENDING",
            submittedFields,
            authoritativeFields: null,
            discrepancies: [
                {
                    field: "fdrOrAccountNumber",
                    label: "Bank Branch Confirmation Status",
                    submitted: queryRef,
                    authoritative: "Pending Branch Response",
                    observation: `Official bank confirmation letter pending receipt from branch manager (${bankName || "Issuing Bank"}).`,
                },
            ],
            summary: `Branch confirmation pending for FDR '${queryRef}'. No response or recorded confirmation letter received yet. Awaiting official written confirmation from branch manager.`,
            scrutinyActionPrompt: "Scrutiny committee cannot treat bank funds as verified until written confirmation is received and recorded from branch manager.",
        };
    }
    const authoritativeFields = {
        fdrOrAccountNumber: found.fdrOrAccountNumber,
        bankName: found.bankName,
        branchName: found.branchName,
        accountHolderName: found.accountHolderName,
        depositAmountLakhsINR: found.depositAmountLakhsINR,
        depositDate: found.depositDate,
        maturityDate: found.maturityDate,
        isUnencumbered: found.isUnencumbered,
        lienDetails: found.lienDetails,
        branchConfirmationStatus: found.branchConfirmationStatus,
    };
    const discrepancies = [];
    if (!found.isUnencumbered || found.branchConfirmationStatus === "LIEN_DETECTED") {
        discrepancies.push({
            field: "isUnencumbered",
            label: "Deposit Encumbrance / Lien",
            submitted: "Free from encumbrance",
            authoritative: found.lienDetails || "Active lien reported by bank",
            observation: `Simulated branch response indicates active lien on deposit: '${found.lienDetails}'.`,
        });
        return {
            authorityCategory: "BANK_BRANCH",
            authorityName,
            verificationMode: "SIMULATED_BRANCH_INQUIRY",
            sourceName: "Simulated Bank Branch Confirmation Response",
            queryReference: queryRef,
            documentId: document?.id || null,
            status: "MISMATCH_DETECTED",
            submittedFields,
            authoritativeFields,
            discrepancies,
            summary: `Simulated bank inquiry received: Active lien/charge detected on FDR '${queryRef}' (${found.lienDetails}).`,
            scrutinyActionPrompt: "CRITICAL DEFICIENCY: Bank confirms an active lien on the FDR. Mandatory funds must be entirely unencumbered under APH Chapter I.",
        };
    }
    const normSubmittedHolder = normalizeString(accountHolder);
    const normAuthHolder = normalizeString(found.accountHolderName);
    if (normSubmittedHolder && normAuthHolder && normSubmittedHolder !== normAuthHolder) {
        discrepancies.push({
            field: "accountHolderName",
            label: "Account Holder Name",
            submitted: accountHolder,
            authoritative: found.accountHolderName,
            observation: `Submitted deposit holder '${accountHolder}' differs from bank record '${found.accountHolderName}'.`,
        });
    }
    if (discrepancies.length > 0) {
        return {
            authorityCategory: "BANK_BRANCH",
            authorityName,
            verificationMode: "SIMULATED_BRANCH_INQUIRY",
            sourceName: "Simulated Bank Branch Confirmation Response",
            queryReference: queryRef,
            documentId: document?.id || null,
            status: "MISMATCH_DETECTED",
            submittedFields,
            authoritativeFields,
            discrepancies,
            summary: `Simulated bank branch response received, but ${discrepancies.length} discrepancy(ies) detected.`,
            scrutinyActionPrompt: "Clarify discrepancies with issuing bank branch before granting clearance.",
        };
    }
    return {
        authorityCategory: "BANK_BRANCH",
        authorityName,
        verificationMode: "SIMULATED_BRANCH_INQUIRY",
        sourceName: "Simulated Bank Branch Confirmation Response",
        queryReference: queryRef,
        documentId: document?.id || null,
        status: "VERIFIED_SIMULATED",
        submittedFields,
        authoritativeFields,
        discrepancies: [],
        summary: `Simulated bank inquiry response: State Bank of India confirms unencumbered deposit of ₹${found.depositAmountLakhsINR} Lakhs in favour of '${found.accountHolderName}'. Note: simulated inquiry for prototype scrutiny; officer confirmation letter should be verified before formal approval.`,
        scrutinyActionPrompt: "Deposit confirmed in simulated branch response. Verify physical branch manager letter on record prior to final order.",
    };
}
//# sourceMappingURL=bank-confirmation.adapter.js.map