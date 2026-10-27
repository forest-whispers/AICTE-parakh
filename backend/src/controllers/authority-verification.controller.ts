import type { Request, Response } from "express";
import { authorityVerificationService } from "../services/authority-adapters/index.js";

export const runAuthorityVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const { officerBankConfirmation } = req.body || {};

    const summary = await authorityVerificationService.verifyApplication(id, {
      officerBankConfirmation,
    });

    res.status(200).json({
      success: true,
      message: "Authority verification completed successfully.",
      data: summary,
    });
  } catch (error: any) {
    console.error("Error executing authority verification:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute authority verification.",
    });
  }
};

export const getAuthorityVerifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const verifications = await authorityVerificationService.getLatestVerifications(id);

    res.status(200).json({
      success: true,
      data: verifications,
    });
  } catch (error: any) {
    console.error("Error fetching authority verifications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch authority verifications.",
    });
  }
};

export const recordBankConfirmation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      letterReference,
      letterDate,
      recordingOfficer,
      branchManagerName,
      confirmedAmountLakhs,
      isUnencumbered,
      remarks,
      documentId,
    } = req.body;

    if (!letterReference || !recordingOfficer || confirmedAmountLakhs === undefined) {
      res.status(400).json({
        success: false,
        error: "letterReference, recordingOfficer, and confirmedAmountLakhs are required.",
      });
      return;
    }

    const record = await authorityVerificationService.recordOfficerBankConfirmation(
      id,
      {
        letterReference,
        letterDate: letterDate || new Date().toISOString().split("T")[0],
        recordingOfficer,
        branchManagerName,
        confirmedAmountLakhs: Number(confirmedAmountLakhs),
        isUnencumbered: isUnencumbered ?? true,
        remarks,
      },
      documentId
    );

    res.status(201).json({
      success: true,
      message: "Bank confirmation letter recorded successfully.",
      data: record,
    });
  } catch (error: any) {
    console.error("Error recording bank confirmation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to record bank confirmation.",
    });
  }
};

export const getVerificationHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const history = await authorityVerificationService.getHistoricalBatches(id);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Error fetching verification history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch verification history.",
    });
  }
};
