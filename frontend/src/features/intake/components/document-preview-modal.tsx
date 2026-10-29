import React from "react";
import type {
  StagedDocument,
  DocumentReviewSubmission,
  BackendScrutinyReport,
} from "../types/intake.types";
import type { DocumentValidationBadge } from "../utils/validation-state";
import { DocumentReviewModal } from "./document-review-modal";

export interface DocumentPreviewModalProps {
  document: StagedDocument | null;
  isOpen?: boolean;
  onClose: () => void;
  validationBadge?: DocumentValidationBadge;
  isReadOnly?: boolean;
  onUpdateStatus?: (
    status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET",
    notes?: string
  ) => Promise<boolean>;
  onSaveReview?: (
    submission: DocumentReviewSubmission
  ) => Promise<{ success: boolean; scrutinyReport?: BackendScrutinyReport | null; error?: string }>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen = Boolean(document),
  onClose,
  validationBadge,
  isReadOnly,
  onUpdateStatus,
  onSaveReview,
}) => {
  const handleSave = async (submission: DocumentReviewSubmission) => {
    if (onSaveReview) {
      return await onSaveReview(submission);
    }
    if (onUpdateStatus) {
      const ok = await onUpdateStatus(submission.status, submission.notes);
      return { success: ok };
    }
    return { success: false, error: "No review save handler configured." };
  };

  return (
    <DocumentReviewModal
      document={document}
      isOpen={isOpen && Boolean(document)}
      onClose={onClose}
      validationBadge={validationBadge}
      isReadOnly={isReadOnly}
      onSaveReview={handleSave}
    />
  );
};
