import { apiClient } from "../../../shared/api/client";
import type {
  VerificationBatchSummary,
  AuthorityVerificationRecord,
  HistoricalBatchEntry,
  BankConfirmationPayload,
} from "../types/authority.types";

export const authorityApi = {
  /**
   * Fetch latest authority verification run or a specific batch.
   */
  async getVerifications(
    applicationId: string,
    batchId?: string
  ): Promise<VerificationBatchSummary | null> {
    const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
    const res = await apiClient<{ success: boolean; data: VerificationBatchSummary | null }>(
      `/applications/${applicationId}/verifications${query}`
    );
    return res.data || null;
  },

  /**
   * Execute authority verification across all supported document types.
   */
  async runVerification(applicationId: string): Promise<VerificationBatchSummary> {
    const res = await apiClient<{ success: boolean; data: VerificationBatchSummary; message?: string }>(
      `/applications/${applicationId}/verify`,
      {
        method: "POST",
      }
    );
    return res.data;
  },

  /**
   * Record manual bank branch letter confirmation.
   */
  async recordBankConfirmation(
    applicationId: string,
    payload: BankConfirmationPayload
  ): Promise<AuthorityVerificationRecord> {
    const res = await apiClient<{
      success: boolean;
      data: AuthorityVerificationRecord;
      message?: string;
    }>(`/applications/${applicationId}/verify/bank-confirmation`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Fetch historical verification batches.
   */
  async getHistory(applicationId: string): Promise<HistoricalBatchEntry[]> {
    const res = await apiClient<{ success: boolean; data: HistoricalBatchEntry[] }>(
      `/applications/${applicationId}/verifications/history`
    );
    return res.data || [];
  },
};

