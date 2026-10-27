import type { AdapterVerificationResult } from "./types.js";
export interface OfficerBankConfirmationPayload {
    letterReference: string;
    letterDate: string;
    recordingOfficer: string;
    branchManagerName?: string;
    confirmedAmountLakhs: number;
    isUnencumbered: boolean;
    remarks?: string;
}
export declare function verifyBankConfirmation(document: any, officerConfirmation?: OfficerBankConfirmationPayload): AdapterVerificationResult;
//# sourceMappingURL=bank-confirmation.adapter.d.ts.map